#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include "HX711.h"

// Load Topology Lab · protocol 1 · ESP32 / Arduino
// USB CDC/serial: newline-delimited UTF-8 JSON at 115200 baud.
static constexpr uint8_t MEMBER_COUNT = 6;
static constexpr uint8_t HX_DOUT[MEMBER_COUNT] = {4, 16, 17, 18, 19, 23};
static constexpr uint8_t HX_SCK[MEMBER_COUNT]  = {5, 21, 22, 25, 26, 27};
static constexpr uint8_t LOCK_CHANNEL[MEMBER_COUNT] = {0, 1, 2, 3, 4, 5};
static constexpr uint8_t PROBE_SERVO_CHANNEL = 6;
static constexpr uint8_t ESTOP_PIN = 33;  // Wire as normally-closed, active-low circuit.
static constexpr uint32_t HEARTBEAT_TIMEOUT_MS = 3000;
static constexpr uint32_t TELEMETRY_PERIOD_MS = 100;
static constexpr uint32_t OLED_PERIOD_MS = 250;
static constexpr float DEFAULT_MAX_LOAD_N[MEMBER_COUNT] = {100,100,100,100,100,100};
static constexpr int SERVO_RELEASE_US = 700;
static constexpr int SERVO_LOCK_US = 2200;

HX711 cells[MEMBER_COUNT];
Adafruit_PWMServoDriver pwm(0x40);
Adafruit_SSD1306 display(128, 64, &Wire, -1);
float maxLoad[MEMBER_COUNT];
float calibration[MEMBER_COUNT] = {2280,2280,2280,2280,2280,2280};
float loads[MEMBER_COUNT] = {};
int locks[MEMBER_COUNT] = {};
uint32_t seq = 0, lastHeartbeat = 0, lastTelemetry = 0, lastOled = 0;
bool safeHold = false, probeActive = false;
String inputLine;

void sendJson(JsonDocument& doc) { serializeJson(doc, Serial); Serial.println(); }
void reply(uint32_t id, bool ok, const char* error = nullptr) {
  JsonDocument doc; doc["type"] = "ack"; doc["id"] = id; doc["ok"] = ok;
  if (error) doc["error"] = error; sendJson(doc);
}
void event(const char* code, int member = -1, float value = 0) {
  JsonDocument doc; doc["type"] = "event"; doc["code"] = code;
  if (member >= 0) { doc["member"] = member + 1; doc["value"] = value; } sendJson(doc);
}
void setProbe(bool active) { probeActive = active; pwm.setPWM(PROBE_SERVO_CHANNEL, 0, active ? 330 : 120); }
void setMemberLock(uint8_t i, bool active) {
  locks[i] = active ? 1 : 0;
  pwm.setPWM(LOCK_CHANNEL[i], 0, active ? 420 : 125);
}
void enterSafeHold(const char* code, int member = -1, float value = 0) {
  setProbe(false); safeHold = true;
  // Preserve load-bearing member locks in place; ESTOP never unlocks the structure.
  event(code, member, value);
}
void sendHello() { JsonDocument doc; doc["type"] = "hello"; doc["fw"] = "0.1.0"; doc["members"] = MEMBER_COUNT; doc["locks"] = MEMBER_COUNT; sendJson(doc); }
void handleCommand(JsonDocument& doc) {
  uint32_t id = doc["id"] | 0; const char* cmd = doc["cmd"] | "";
  if (strcmp(cmd, "ping") == 0) { lastHeartbeat = millis(); reply(id, true); return; }
  if (strcmp(cmd, "estop") == 0) { enterSafeHold("ESTOP"); reply(id, true); return; }
  if (strcmp(cmd, "tare") == 0) {
    for (uint8_t i=0;i<MEMBER_COUNT;i++) if (cells[i].is_ready()) cells[i].tare(10);
    lastHeartbeat = millis(); reply(id, true); return;
  }
  if (strcmp(cmd, "set_limits") == 0) {
    JsonArray values = doc["max_member_load"].as<JsonArray>();
    if (values.size()!=MEMBER_COUNT) { reply(id,false,"INVALID_LIMITS"); return; }
    for (uint8_t i=0;i<MEMBER_COUNT;i++) maxLoad[i]=values[i].as<float>();
    reply(id,true); return;
  }
  if (strcmp(cmd, "calibrate") == 0) {
    int member=(doc["member"]|0)-1; float known=doc["known_load"]|0.0f;
    if(member<0||member>=MEMBER_COUNT||known<=0||!cells[member].is_ready()){reply(id,false,"INVALID_CALIBRATION");return;}
    float raw=cells[member].get_units(8); if(fabsf(raw)>1e-3f) calibration[member]*=raw/known;
    reply(id,true); return;
  }
  if (strcmp(cmd, "probe") == 0) {
    if(safeHold||digitalRead(ESTOP_PIN)==LOW){enterSafeHold("ESTOP");reply(id,false,"SAFE_HOLD");return;}
    lastHeartbeat=millis();int duration=constrain((int)(doc["dur_ms"]|200),1,2000);setProbe(true);delay(duration);setProbe(false);reply(id,true);return;
  }
  if (strcmp(cmd, "set_topology") == 0) {
    if(safeHold){reply(id,false,"SAFE_HOLD");return;} JsonArray values=doc["active"].as<JsonArray>();
    if(values.size()!=MEMBER_COUNT){reply(id,false,"INVALID_TOPOLOGY");return;}
    lastHeartbeat=millis(); for(uint8_t i=0;i<MEMBER_COUNT;i++)setMemberLock(i,values[i].as<int>()!=0);
    reply(id,true); return;
  }
  reply(id,false,"UNKNOWN_COMMAND");
}
void processLine(const String& line) {
  JsonDocument doc; DeserializationError error=deserializeJson(doc,line);
  if(error){event("JSON_PARSE_ERROR");return;} handleCommand(doc);
}
void updateLoads() {
  for(uint8_t i=0;i<MEMBER_COUNT;i++){
    if(cells[i].is_ready())loads[i]=cells[i].get_units(1)*calibration[i];
    if(fabsf(loads[i])>maxLoad[i])enterSafeHold("OVERLOAD",i,loads[i]);
  }
}
void sendTelemetry() {
  JsonDocument doc;doc["type"]="telemetry";doc["t"]=millis();doc["seq"]=seq++;
  JsonArray values=doc["loads"].to<JsonArray>(),state=doc["locks"].to<JsonArray>();
  for(uint8_t i=0;i<MEMBER_COUNT;i++){values.add(loads[i]);state.add(locks[i]);}
  doc["probe"]=probeActive?"active":"idle";sendJson(doc);
}
void drawStatus() {
  display.clearDisplay();display.setTextSize(1);display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);display.print("LOAD TOPOLOGY LAB");display.setCursor(0,14);
  display.print(safeHold?"SAFE-HOLD":"READY");display.setCursor(0,26);display.print("TOPOLOGY ");
  uint8_t mask=0;for(uint8_t i=0;i<MEMBER_COUNT;i++)if(locks[i])mask|=1<<i;
  display.print(mask,HEX);display.setCursor(0,38);display.print("USB ");display.print(Serial?"ONLINE":"OFFLINE");display.setCursor(0,50);display.print("P ");display.print(probeActive?"ACTIVE":"IDLE");display.display();
}
void setup() {
  pinMode(ESTOP_PIN,INPUT_PULLUP);Serial.begin(115200);Wire.begin();pwm.begin();pwm.setPWMFreq(50);
  display.begin(SSD1306_SWITCHCAPVCC,0x3C);inputLine.reserve(512);
  for(uint8_t i=0;i<MEMBER_COUNT;i++){maxLoad[i]=DEFAULT_MAX_LOAD_N[i];cells[i].begin(HX_DOUT[i],HX_SCK[i]);cells[i].set_scale(calibration[i]);cells[i].tare(5);setMemberLock(i,false);}
  setProbe(false);lastHeartbeat=millis();drawStatus();sendHello();
}
void loop() {
  while(Serial.available()){
    char c=(char)Serial.read();
    if(c=='\n'){inputLine.trim();if(inputLine.length())processLine(inputLine);inputLine="";}
    else if(c!='\r'){if(inputLine.length()<1024)inputLine+=c;else{inputLine="";event("LINE_TOO_LONG");}}
  }
  const uint32_t now=millis();
  if(!safeHold&&digitalRead(ESTOP_PIN)==LOW)enterSafeHold("ESTOP");
  if(!safeHold&&now-lastHeartbeat>HEARTBEAT_TIMEOUT_MS)enterSafeHold("HEARTBEAT_TIMEOUT");
  if(now-lastTelemetry>=TELEMETRY_PERIOD_MS){lastTelemetry=now;updateLoads();sendTelemetry();}
  if(now-lastOled>=OLED_PERIOD_MS){lastOled=now;drawStatus();}
}
