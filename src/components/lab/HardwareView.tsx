import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Terminal,
  Activity,
  Radio,
  AlertTriangle,
  Play,
  Square,
  Send,
  Zap,
  CheckCircle2,
  XCircle,
  FileCode,
} from "lucide-react";
import {
  serialSupported,
  JsonLineParser,
  CommandAcker,
  frameCommand,
  type DeviceMessage,
  type DeviceCommand,
  type ProtocolStats,
} from "@/lib/lab/serial";
import { MEMBER_NAMES } from "@/lib/lab/solver";

interface HardwareViewProps {
  mask: number;
  simulationMode: "sim" | "virtual-esp32" | "live-hardware";
  onSelectMode: (mode: "sim" | "virtual-esp32" | "live-hardware") => void;
  onEmergencyStop: () => void;
  onResetSafety: () => void;
  isSafeHold: boolean;
}

interface LogEntry {
  dir: "tx" | "rx";
  text: string;
  time: string;
}

export const HardwareView: React.FC<HardwareViewProps> = ({
  mask,
  simulationMode,
  onSelectMode,
  onEmergencyStop,
  onResetSafety,
  isSafeHold,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      dir: "rx",
      text: '{"type":"hello","fw":"0.1.0","members":6,"locks":6}',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [autoscroll, setAutoscroll] = useState(true);
  const [stats, setStats] = useState<ProtocolStats>({
    parseErrors: 0,
    droppedLines: 0,
    droppedSequences: 0,
    received: 1,
    lastSeen: Date.now(),
    latency: 12,
    telemetryRate: 10.1,
  });

  const [virtualEspRunning, setVirtualEspRunning] = useState(simulationMode === "virtual-esp32");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(100);

  // Virtual ESP32 10Hz telemetry emitter
  useEffect(() => {
    if (simulationMode !== "virtual-esp32") return;
    const interval = setInterval(() => {
      seqRef.current = (seqRef.current + 1) % 65536;
      const t = Date.now();
      const loads = MEMBER_NAMES.map((_, i) =>
        mask & (1 << i) ? +(Math.random() * 40 + 10).toFixed(1) : 0,
      );
      const locks = MEMBER_NAMES.map((_, i) => (mask & (1 << i) ? 1 : 0));

      const telemetry: DeviceMessage = {
        type: "telemetry",
        t,
        seq: seqRef.current,
        loads,
        locks,
        probe: "idle",
      };

      const line = JSON.stringify(telemetry);
      setLogs((prev) => [
        ...prev.slice(-80),
        { dir: "rx", text: line, time: new Date(t).toLocaleTimeString() },
      ]);

      setStats((prev) => ({
        ...prev,
        received: prev.received + 1,
        lastSeen: t,
        telemetryRate: 10.0 + Math.random() * 0.4,
      }));
    }, 100); // 10 Hz

    return () => clearInterval(interval);
  }, [simulationMode, mask]);

  useEffect(() => {
    if (autoscroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoscroll]);

  const sendCommand = (cmd: DeviceCommand) => {
    const id = Math.floor(Math.random() * 9000 + 1000);
    const framed = frameCommand(cmd, id);
    const time = new Date().toLocaleTimeString();

    setLogs((prev) => [...prev.slice(-80), { dir: "tx", text: framed.trim(), time }]);

    // Virtual ACK response
    if (simulationMode === "virtual-esp32") {
      setTimeout(() => {
        const ack: DeviceMessage = { type: "ack", id, ok: true };
        setLogs((prev) => [
          ...prev.slice(-80),
          {
            dir: "rx",
            text: JSON.stringify(ack),
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }, 15);
    }
  };

  const handleInjectDroppedSeq = () => {
    seqRef.current = (seqRef.current + 4) % 65536;
    setStats((prev) => ({ ...prev, droppedSequences: prev.droppedSequences + 3 }));
  };

  const handleInjectOverload = () => {
    const evt: DeviceMessage = {
      type: "event",
      code: "OVERLOAD",
      member: 4,
      value: 142.3,
    };
    setLogs((prev) => [
      ...prev.slice(-80),
      {
        dir: "rx",
        text: JSON.stringify(evt),
        time: new Date().toLocaleTimeString(),
      },
    ]);
    onEmergencyStop();
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-400" />
            ESP32 HARDWARE & SERIAL COMMUNICATIONS PIPELINE
          </h2>
          <p className="text-xs text-slate-400">
            Bidirectional newline JSON Line stream at 115200 baud. Connect to physical ESP32 or
            activate the virtual emulator.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="hardware-mode-virtual-btn"
            onClick={() => onSelectMode("virtual-esp32")}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
              simulationMode === "virtual-esp32"
                ? "bg-teal-500 text-slate-950 shadow-md"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            Virtual ESP32 Simulator
          </button>
          <button
            id="hardware-mode-live-btn"
            onClick={() => onSelectMode("live-hardware")}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
              simulationMode === "live-hardware"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            Connect Web Serial
          </button>
        </div>
      </div>

      {/* Protocol Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Telemetry Rate</span>
          <span className="text-lg font-bold text-teal-400">
            {stats.telemetryRate.toFixed(1)} Hz
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Packets Received</span>
          <span className="text-lg font-bold text-slate-200">{stats.received}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Dropped Sequences</span>
          <span
            className={`text-lg font-bold ${
              stats.droppedSequences > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {stats.droppedSequences}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Parse Errors</span>
          <span
            className={`text-lg font-bold ${
              stats.parseErrors > 0 ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {stats.parseErrors}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Roundtrip Latency</span>
          <span className="text-lg font-bold text-sky-400">{stats.latency ?? 0} ms</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-500 text-[10px] uppercase block">Safe-Hold Watchdog</span>
          <span
            className={`text-lg font-bold ${
              isSafeHold ? "text-rose-400 animate-pulse" : "text-emerald-400"
            }`}
          >
            {isSafeHold ? "TRIPPED" : "ARMED (3s)"}
          </span>
        </div>
      </div>

      {/* Main Grid: Terminal Console (8 cols) + Commands & Wiring (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Terminal Console (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Terminal className="w-4 h-4 text-teal-400" />
                <span>SERIAL STREAM MONITOR (115200 BAUD)</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoscroll}
                    onChange={(e) => setAutoscroll(e.target.checked)}
                    className="accent-teal-500 rounded"
                  />
                  <span>Autoscroll</span>
                </label>
                <button
                  onClick={() => setLogs([])}
                  className="text-slate-500 hover:text-slate-300 text-[11px] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Terminal Window */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-3 rounded-lg font-mono text-[11px] space-y-1 border border-slate-900 select-text">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-tight">
                  <span className="text-slate-600 shrink-0 text-[10px]">{log.time}</span>
                  <span
                    className={`font-bold shrink-0 text-[10px] px-1 rounded ${
                      log.dir === "tx"
                        ? "bg-sky-950 text-sky-400 border border-sky-800"
                        : "bg-teal-950 text-teal-400 border border-teal-800"
                    }`}
                  >
                    {log.dir.toUpperCase()}
                  </span>
                  <span
                    className={
                      log.dir === "tx" ? "text-sky-300 break-all" : "text-teal-200 break-all"
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

        {/* Command Dispatcher & Pinout Reference (4 cols) */}
        <div className="lg:col-span-4 space-y-4 font-mono text-xs">
          {/* Dispatcher Actions */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider">
              Hardware Command Dispatcher
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="cmd-ping-btn"
                onClick={() => sendCommand({ cmd: "ping" })}
                className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 font-semibold cursor-pointer"
              >
                Send Ping
              </button>
              <button
                id="cmd-tare-btn"
                onClick={() => sendCommand({ cmd: "tare" })}
                className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-teal-400 font-semibold cursor-pointer"
              >
                Tare Cells
              </button>
              <button
                id="cmd-topology-btn"
                onClick={() =>
                  sendCommand({
                    cmd: "set_topology",
                    active: Array.from({ length: 6 }, (_, i) => (mask & (1 << i) ? 1 : 0)),
                  })
                }
                className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-400 font-semibold cursor-pointer"
              >
                Set Locks (#{mask})
              </button>
              <button
                id="cmd-probe-btn"
                onClick={() =>
                  sendCommand({
                    cmd: "probe",
                    node: 2,
                    dir: [0, 100],
                    amp: 100,
                    dur_ms: 500,
                  })
                }
                className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 font-semibold cursor-pointer"
              >
                Actuate Probe
              </button>
            </div>

            {/* Test Fault Injection */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase block">
                Simulator Fault Injection
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleInjectDroppedSeq}
                  className="p-2 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 text-amber-300 text-[11px] cursor-pointer"
                >
                  Drop 3 Sequences
                </button>
                <button
                  onClick={handleInjectOverload}
                  className="p-2 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-[11px] cursor-pointer"
                >
                  Trigger Overload
                </button>
              </div>
            </div>
          </div>

          {/* Reference Pinout Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                ESP32 Reference Pinout
              </h3>
              <span className="text-[10px] text-slate-500">firmware/main.ino</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span>HX711 DOUT (M1–M6):</span>
                <span className="text-slate-200">4, 16, 17, 18, 19, 23</span>
              </div>
              <div className="flex justify-between">
                <span>HX711 SCK (M1–M6):</span>
                <span className="text-slate-200">5, 21, 22, 25, 26, 27</span>
              </div>
              <div className="flex justify-between">
                <span>PCA9685 Servos (I2C):</span>
                <span className="text-slate-200">Addr 0x40 (Ch 0–5)</span>
              </div>
              <div className="flex justify-between">
                <span>E-Stop Interlock:</span>
                <span className="text-rose-400">GPIO 33 (Active LOW)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
