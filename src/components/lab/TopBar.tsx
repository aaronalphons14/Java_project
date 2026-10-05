import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  OctagonX,
  Radio,
  Cpu,
  Binary,
} from "lucide-react";
import type { SafetyState, SimulationMode } from "./types";
import type { LoadCaseId } from "@/lib/lab/solver";

interface TopBarProps {
  mask: number;
  activeLoadCase: LoadCaseId;
  safetyState: SafetyState;
  simulationMode: SimulationMode;
  onEmergencyStop: () => void;
  onResetSafety: () => void;
  onSelectMode: (mode: SimulationMode) => void;
  activeMemberCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  mask,
  activeLoadCase,
  safetyState,
  simulationMode,
  onEmergencyStop,
  onResetSafety,
  onSelectMode,
  activeMemberCount,
}) => {
  const binaryString = mask.toString(2).padStart(6, "0");

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur border-b border-slate-800 text-slate-100 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm tracking-wide text-white">
                LOAD TOPOLOGY LAB
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/80 font-mono">
                WORKBENCH v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              In-Silico Structural Qualification & Contextual Pruning
            </p>
          </div>
        </div>

        {/* Center: System Status Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          {/* Evidence / Simulation Source Indicator */}
          <div className="relative group">
            <button
              id="topbar-mode-selector"
              onClick={() => {
                const nextMode: Record<SimulationMode, SimulationMode> = {
                  sim: "virtual-esp32",
                  "virtual-esp32": "sim",
                  "live-hardware": "sim",
                };
                onSelectMode(nextMode[simulationMode]);
              }}
              className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
                simulationMode === "sim"
                  ? "bg-indigo-950/80 border-indigo-700/80 text-indigo-300 hover:bg-indigo-900/80"
                  : simulationMode === "virtual-esp32"
                  ? "bg-teal-950/80 border-teal-700/80 text-teal-300 hover:bg-teal-900/80"
                  : "bg-emerald-950/80 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/80"
              }`}
              title="Click to toggle simulation / virtual ESP32 mode"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {simulationMode === "sim" && "SIMULATION (SYNTHETIC)"}
                {simulationMode === "virtual-esp32" && "VIRTUAL ESP32 (10Hz)"}
                {simulationMode === "live-hardware" && "LIVE WEB SERIAL"}
              </span>
            </button>
          </div>

          {/* Commanded Topology */}
          <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <Binary className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Mask #{mask} <span className="text-slate-500">({binaryString})</span>
            </span>
            <span className="text-[10px] text-sky-400 font-semibold">
              {activeMemberCount}/6 M
            </span>
          </div>

          {/* Active Load Case */}
          <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            Case: <span className="font-semibold text-amber-300">{activeLoadCase}</span>
          </div>

          {/* Safety Status Pill */}
          <div
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-bold ${
              safetyState === "normal"
                ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-400"
                : safetyState === "warning"
                ? "bg-amber-950/60 border-amber-800/80 text-amber-400"
                : "bg-rose-950 border-rose-600 text-rose-300 animate-pulse"
            }`}
          >
            {safetyState === "normal" && <ShieldCheck className="w-3.5 h-3.5" />}
            {safetyState === "warning" && <AlertTriangle className="w-3.5 h-3.5" />}
            {safetyState === "safe-hold" && <ShieldAlert className="w-3.5 h-3.5" />}
            <span>
              {safetyState === "normal" && "NOMINAL"}
              {safetyState === "warning" && "WARNING"}
              {safetyState === "safe-hold" && "SAFE-HOLD"}
            </span>
          </div>
        </div>

        {/* Right: Emergency Controls */}
        <div className="flex items-center gap-2">
          {safetyState === "safe-hold" ? (
            <button
              id="topbar-reset-safety-btn"
              onClick={onResetSafety}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-700/30 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET SAFE-HOLD</span>
            </button>
          ) : (
            <button
              id="topbar-estop-btn"
              onClick={onEmergencyStop}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer border border-rose-400/40"
              title="Trigger Emergency Stop: retracts probe, locks members, activates SAFE-HOLD"
            >
              <OctagonX className="w-4 h-4" />
              <span>E-STOP</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
