import React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Gauge,
  Layers,
  BrainCircuit,
  Cpu,
  ArrowRight,
  Flame,
} from "lucide-react";
import { TrussCanvas } from "./TrussCanvas";
import {
  LOAD_CASES,
  MEMBER_NAMES,
  type LoadCaseId,
  type SolveResult,
  type Defect,
  l1Error,
} from "@/lib/lab/solver";
import { soundnessRate, type Pattern } from "@/lib/lab/patterns";
import type { LabEvent } from "@/lib/lab/storage";
import type { LabViewId } from "./types";

interface DashboardViewProps {
  mask: number;
  activeLoadCase: LoadCaseId;
  solveNominal: SolveResult | null;
  solveRealized: SolveResult | null;
  defects: Defect[];
  patterns: Pattern[];
  events: LabEvent[];
  prunedCount: number;
  onToggleMember: (index: number) => void;
  onSelectLoadCase: (id: LoadCaseId) => void;
  onExecuteProbe: () => void;
  onNavigate: (view: LabViewId) => void;
  isProbing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  mask,
  activeLoadCase,
  solveNominal,
  solveRealized,
  defects,
  patterns,
  events,
  prunedCount,
  onToggleMember,
  onSelectLoadCase,
  onExecuteProbe,
  onNavigate,
  isProbing,
}) => {
  const currentError =
    solveNominal && solveRealized
      ? l1Error(solveNominal.fingerprint, solveRealized.fingerprint)
      : 0;

  const currentSoundness = soundnessRate(patterns);
  const activeMembers = Array.from({ length: 6 }, (_, i) => i).filter((i) =>
    Boolean(mask & (1 << i))
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Realization Error */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Realization Error (L1)
            </span>
            {currentError > 0.1 ? (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                currentError > 0.1 ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {currentError.toFixed(3)}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 2.0 max</span>
          </div>
          <div className="mt-2">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  currentError > 0.1 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, (currentError / 0.5) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>Threshold: 0.100</span>
              <span>{currentError > 0.1 ? "MISMATCH DETECTED" : "MODEL MATCH"}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Search Space Pruning */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Search Space Pruned
            </span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-400">
              {prunedCount} / 64
            </span>
            <span className="text-xs text-sky-500 font-mono">
              ({((prunedCount / 64) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${(prunedCount / 64) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>{64 - prunedCount} Viable Candidates</span>
              <button
                onClick={() => onNavigate("searchspace")}
                className="text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Inspect <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Context Memory Soundness */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Pattern Soundness
            </span>
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-400">
              {(currentSoundness * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({patterns.length} Rules Active)
            </span>
          </div>
          <div className="mt-2">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${currentSoundness * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>Refined upon counterexamples</span>
              <button
                onClick={() => onNavigate("memory")}
                className="text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Rules <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Actuator & Locks State */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Actuated Locks
            </span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {activeMembers.length} / 6
            </span>
            <span className="text-xs text-slate-500 font-mono">Members Engaged</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {MEMBER_NAMES.map((name, i) => {
              const active = Boolean(mask & (1 << i));
              return (
                <span
                  key={name}
                  onClick={() => onToggleMember(i)}
                  className={`flex-1 py-0.5 text-center rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                    active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-500 border border-slate-700/50"
                  }`}
                  title={`Click to toggle ${name}`}
                >
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Truss + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Truss & Fingerprint (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div>
                <h2 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  RECONFIGURABLE TRUSS VISUALIZATION
                </h2>
                <p className="text-xs text-slate-400">
                  Four planar joints J1–J4 · Six axial members M1–M6 · Pinned J1 · Roller J2
                </p>
              </div>

              <button
                id="dashboard-execute-probe-btn"
                onClick={onExecuteProbe}
                disabled={isProbing}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                <Flame className={`w-3.5 h-3.5 ${isProbing ? "animate-spin" : ""}`} />
                <span>{isProbing ? "PROBING..." : "APPLY PROBE"}</span>
              </button>
            </div>

            {/* Canvas */}
            <TrussCanvas
              mask={mask}
              activeLoadCase={activeLoadCase}
              solveNominal={solveNominal}
              solveRealized={solveRealized}
              defects={defects}
              onToggleMember={onToggleMember}
              className="my-2"
            />
          </div>

          {/* Member Load Distribution Bars */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Member Internal Forces & Fingerprints
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Commanded (Nominal) vs Measured (Realized)
              </span>
            </div>

            <div className="space-y-2.5">
              {MEMBER_NAMES.map((name, i) => {
                const isActive = Boolean(mask & (1 << i));
                const nomLoad = solveNominal?.loads[i] ?? 0;
                const realLoad = solveRealized?.loads[i] ?? 0;
                const nomFp = (solveNominal?.fingerprint[i] ?? 0) * 100;
                const realFp = (solveRealized?.fingerprint[i] ?? 0) * 100;
                const diff = Math.abs(nomFp - realFp);

                return (
                  <div key={name} className="flex items-center gap-3 text-xs font-mono">
                    <span
                      className={`w-7 text-center font-bold px-1 py-0.5 rounded ${
                        isActive
                          ? "bg-slate-800 text-sky-400 border border-slate-700"
                          : "text-slate-600"
                      }`}
                    >
                      {name}
                    </span>

                    {/* Bar comparison */}
                    <div className="flex-1 space-y-1">
                      {/* Nominal Bar */}
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-[10px] text-slate-500">Nom:</span>
                        <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500/70 transition-all"
                            style={{ width: `${Math.min(100, nomFp * 1.5)}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-[10px] text-sky-300">
                          {nomLoad > 0 ? "+" : ""}
                          {nomLoad.toFixed(1)} N
                        </span>
                      </div>

                      {/* Realized Bar */}
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-[10px] text-slate-500">Real:</span>
                        <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              diff > 5 ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${Math.min(100, realFp * 1.5)}%` }}
                          />
                        </div>
                        <span
                          className={`w-16 text-right text-[10px] ${
                            diff > 5 ? "text-amber-400 font-bold" : "text-emerald-300"
                          }`}
                        >
                          {realLoad > 0 ? "+" : ""}
                          {realLoad.toFixed(1)} N
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Load Cases, Actuation, Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Load Case Selection Panel */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Qualification Load Case
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LOAD_CASES.map((lc) => {
                const isSelected = activeLoadCase === lc.id;
                return (
                  <button
                    key={lc.id}
                    id={`loadcase-btn-${lc.id}`}
                    onClick={() => onSelectLoadCase(lc.id)}
                    className={`p-2.5 rounded-lg text-left transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500/50 shadow-sm"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isSelected ? "text-amber-400" : "text-slate-300"
                        }`}
                      >
                        {lc.id}: {lc.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        [{lc.force[0]}, {lc.force[1]}] N
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {lc.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Member Lock Actuator Switches */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Commanded Member Locks (PCA9685 Servos)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Mask #{mask} (0x{mask.toString(16).toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MEMBER_NAMES.map((name, i) => {
                const isActive = Boolean(mask & (1 << i));
                return (
                  <button
                    key={name}
                    id={`member-toggle-${name}`}
                    onClick={() => onToggleMember(i)}
                    className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isActive
                        ? "bg-sky-950/40 border-sky-700 text-sky-200"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono font-bold text-xs">{name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? "bg-sky-400" : "bg-slate-600"
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono mt-1">
                      {isActive ? "LOCKED (ACTIVE)" : "RELEASED"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-Time Audit Feed Ticker */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Recent Audit Trail Events
              </h3>
              <button
                onClick={() => onNavigate("eventlog")}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
              >
                View all ({events.length}) <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {events.slice(0, 5).map((evt) => (
                <div
                  key={evt.id}
                  className="p-2 rounded bg-slate-950 border border-slate-800/80 text-xs font-mono flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                          evt.source === "hardware"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : evt.source === "sim"
                            ? "bg-indigo-950 text-indigo-400 border border-indigo-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {evt.source}
                      </span>
                      <span className="text-slate-300 font-semibold">{evt.type}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] line-clamp-1">{evt.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-xs text-slate-500 font-mono italic text-center py-4">
                  No events logged yet. Execute a probe to record data.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
