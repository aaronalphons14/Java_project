# Load Topology Lab ESP32 reference firmware

Firmware for an ESP32, six member load cells read through HX711 amplifiers, six member-lock servos through a PCA9685, a probe servo, and a 128×64 SSD1306 OLED.

## Wiring

| Function | ESP32 pins / bus |
| --- | --- |
| I²C | SDA GPIO 21, SCL GPIO 22 |
| HX711 DOUT M1–M6 | 4, 16, 17, 18, 19, 23 |
| HX711 SCK M1–M6 | 5, 21, 22, 25, 26, 27 |
| PCA9685 | I²C, address 0x40; lock servos channels 0–5, probe channel 6 |
| OLED | I²C, address 0x3C |
| Normally-closed emergency stop | GPIO 33 to ground when pressed/tripped; use an external pull-up as installation requires |
| Logic supply | 3.3 V ESP32 logic; use separately rated servo supply with a common ground |

**Board-specific pin warning:** GPIO 21 and 22 are also the default I²C pins; change the per-sensor HX711 `SCK` pin constants before wiring an HX711 to either I²C pin. ESP32 variants have different reserved and strapping pins. Review the exact board, sensor, servo travel, power supply, and emergency-stop circuitry before powering actuators. The included pin map is a reference, not a safety certification.

Set the `calibration[]` values against verified reference loads and adjust `maxLoad[]` for the physical member limits. Establish servo endpoints mechanically at low energy; the pulse values are examples.

## Protocol v1

UTF-8 JSON Lines at **115200 baud**; each message ends in `\n`. Every app command supplies an integer `id` and gets `{ "type":"ack", "id":n, "ok":true }` or an error. Firmware publishes `hello`, approximately 10 Hz `telemetry`, and safety `event` records.

Device → host: `{"type":"hello","fw":"0.1.0","members":6,"locks":6}`; `{"type":"telemetry","t":123456,"seq":812,"loads":[6],"locks":[6],"probe":"idle"}`; `{"type":"event","code":"OVERLOAD","member":5,"value":142.3}`.

Host → device: `ping`, `tare`, `estop`, `calibrate` (`member` is one-based and `known_load` is newtons), `set_topology` (`active` is six 0/1 values), `probe` (`node`, `dir`, `amp`, `dur_ms`), and `set_limits` (`max_member_load` in newtons).

A missing command heartbeat for 3 seconds or a load-limit violation enters **SAFE-HOLD**: retract the probe, hold member locks, and emit a device event. The normally-closed E-stop also enters SAFE-HOLD. A host must confirm safety locally; reboot/inspect hardware before resuming. The host application independently enforces its configured member limits.

## Build

Install the ESP32 Arduino board support and libraries: **HX711**, **Adafruit PWM Servo Driver**, **Adafruit SSD1306**, **Adafruit GFX**, and **ArduinoJson** (7.x). Open `main.ino`, select the correct ESP32 board and serial port, verify I²C address/pins, then compile and flash. Bench-test without attached structural loads before connecting a physical frame.
