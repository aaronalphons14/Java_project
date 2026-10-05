import React, { useState } from "react";
import {
  Flame,
  Plus,
  Trash2,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Sliders,
  Scale,
  Sparkles,
} from "lucide-react";
import { TrussCanvas } from "./TrussCanvas";
import {
  LOAD_CASES,
  MEMBER_NAMES,
  NODE_NAMES,
  type LoadCaseId,
  type SolveResult,
  type Defect,
  l1Error,
} from "@/lib/lab/solver";
import { makePattern, type Pattern } from "@/lib/lab/patterns";

interface ProbeLabViewProps {
  mask: number;
  activeLoadCase: LoadCaseId;
  solveNominal: SolveResult | null;
  solveRealized: SolveResult | null;
  defects: Defect[];
  jointCompliance: number[];
  onToggleMember: (index: number) => void;
  onSelectLoadCase: (id: LoadCaseId) => void;
  onUpdateDefects: (defects: Defect[]) => void;
  onUpdateJointCompliance: (compliance: number[]) => void;
  onExecuteProbe: () => void;
  onInducePattern: (pattern: Pattern) => void;
  isProbing: boolean;
  simulationMode: "sim" | "virtual-esp32" | "live-hardware";
}

export const ProbeLabView: React.FC<ProbeLabViewProps> = ({
  mask,
  activeLoadCase,
  solveNominal,
  solveRealized,
  defects,
  jointCompliance,
  onToggleMember,
  onSelectLoadCase,
  onUpdateDefects,
  onUpdateJointCompliance,
  onExecuteProbe,
  onInducePattern,
  isProbing,
  simulationMode,
}) => {
  const [showDeformed, setShowDeformed] = useState(true);
  const [amplification, setAmplification] = useState(40000);
  const [newDefectMember, setNewDefectMember] = useState(4); // M5
  const [newDefectGap, setNewDefectGap] = useState(0.00002);
  const [newDefectStiffness, setNewDefectStiffness] = useState(0.35);

  const error =
    solveNominal && solveRealized
      ? l1Error(solveNominal.fingerprint, solveRealized.fingerprint)
      : 0;

  const currentCase = LOAD_CASES.find((c) => c.id === activeLoadCase) ?? LOAD_CASES[0]!;

  const handleAddDefect = () => {
    const defect: Defect = {
      member: newDefectMember,
      gap: newDefectGap,
      stiffnessFraction: newDefectStiffness,
      loadCases: [activeLoadCase],
      mustBeActive: [],
      mustBeInactive: [],
      enabled: true,
    };
    onUpdateDefects([...defects, defect]);
  };

  const handleToggleDefect = (index: number) => {
    const updated = defects.map((d, i) => (i === index ? { ...d, enabled: !d.enabled } : d));
    onUpdateDefects(updated);
  };

  const handleDeleteDefect = (index: number) => {
    onUpdateDefects(defects.filter((_, i) => i !== index));
  };

  const handleCreatePattern = () => {
    if (!solveRealized) return;
    const source = simulationMode === "live-hardware" ? "hardware" : "sim";
    const pattern = makePattern(
      mask,
      activeLoadCase,
      solveRealized.fingerprint,
      error > 0.1 ? "unsafe" : "acceptable",
      source
    );
    onInducePattern(pattern);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Probing Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-sky-400" />
            PROBE & SENSING LABORATORY
          </h2>
          <p className="text-xs text-slate-400">
            Apply controlled quasi-static test forces, inspect member reaction fingerprints, and calibrate gap defects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-slate-500">Deform Scale:</span>
            <input
              type="range"
              min="5000"
              max="80000"
              step="5000"
              value={amplification}
              onChange={(e) => setAmplification(Number(e.target.value))}
              className="w-24 accent-sky-500 cursor-pointer"
            />
            <span className="text-[10px] w-10 text-right">×{(amplification / 1000).toFixed(0)}k</span>
          </div>

          <button
            id="probelab-execute-btn"
            onClick={onExecuteProbe}
            disabled={isProbing}
            className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
          >
            <Flame className={`w-4 h-4 ${isProbing ? "animate-spin" : ""}`} />
            <span>{isProbing ? "EXECUTING PROBE..." : "APPLY PROBE FORCE"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Truss Visualization + Realization Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Truss Canvas Container (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-mono font-bold text-slate-300">
                Planar Truss Geometry (Nodes J1–J4)
              </span>
              <div className="flex items-center gap-2 text-xs font-mono">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400">
                  <input
                    type="checkbox"
                    checked={showDeformed}
                    onChange={(e) => setShowDeformed(e.target.checked)}
                    className="accent-sky-500 rounded"
                  />
                  <span>Show Deformed</span>
                </label>
              </div>
            </div>

            <TrussCanvas
              mask={mask}
              activeLoadCase={activeLoadCase}
              solveNominal={solveNominal}
              solveRealized={solveRealized}
              defects={defects}
              showDeformed={showDeformed}
              amplification={amplification}
              onToggleMember={onToggleMember}
            />

            {/* Load Case Quick Switcher */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-mono text-slate-400">Active Load Case:</span>
              <div className="flex gap-1.5">
                {LOAD_CASES.map((lc) => (
                  <button
                    key={lc.id}
                    onClick={() => onSelectLoadCase(lc.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeLoadCase === lc.id
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {lc.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Joint Displacements Table */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
              Nodal Displacements (Elastic Solver)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-1.5">Node</th>
                    <th className="py-1.5">Boundary Condition</th>
                    <th className="py-1.5 text-right">Δx (μm)</th>
                    <th className="py-1.5 text-right">Δy (μm)</th>
                    <th className="py-1.5 text-right">Total Resultant (μm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {NODE_NAMES.map((name, i) => {
                    const disp = solveRealized?.displacement ?? solveNominal?.displacement;
                    const dx = (disp?.[2 * i] ?? 0) * 1e6; // to micrometers
                    const dy = (disp?.[2 * i + 1] ?? 0) * 1e6;
                    const res = Math.hypot(dx, dy);

                    const bc =
                      i === 0
                        ? "Pinned (fixed u, v)"
                        : i === 1
                        ? "Roller (fixed v, free u)"
                        : i === 2
                        ? `Loaded (${currentCase.id})`
                        : "Free Joint";

                    return (
                      <tr key={name}>
                        <td className="py-1.5 font-bold text-sky-400">{name}</td>
                        <td className="py-1.5 text-slate-400">{bc}</td>
                        <td className="py-1.5 text-right">{dx.toFixed(2)}</td>
                        <td className="py-1.5 text-right">{dy.toFixed(2)}</td>
                        <td className="py-1.5 text-right font-semibold text-slate-100">
                          {res.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Fingerprint Mismatch & Tunable Defects (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Realization Error & Fingerprint Comparison Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Structural Fingerprint Comparison
              </h3>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  error > 0.1
                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                }`}
              >
                L1 Error: {error.toFixed(4)}
              </span>
            </div>

            {/* Error Verdict Notice */}
            <div
              className={`p-3 rounded-lg border text-xs font-mono mb-3 ${
                error > 0.1
                  ? "bg-amber-950/30 border-amber-800 text-amber-200"
                  : "bg-emerald-950/30 border-emerald-800 text-emerald-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {error > 0.1 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {error > 0.1
                      ? "Realization Mismatch (Threshold ε = 0.10 exceeded)"
                      : "Nominal Convergence (Structure conforms to model)"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {error > 0.1
                      ? "A physical defect or uncommanded joint engagement was detected. Induce a relationship pattern to prune unsafe configurations."
                      : "Measured sensor forces match commanded truss elasticity within tolerance."}
                  </p>
                </div>
              </div>
            </div>

            {/* Fingerprint Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-1">Member</th>
                    <th className="py-1 text-right">Nominal</th>
                    <th className="py-1 text-right">Realized</th>
                    <th className="py-1 text-right">Δ Load</th>
                    <th className="py-1 text-right">|Δfp|</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {MEMBER_NAMES.map((name, i) => {
                    const nomLoad = solveNominal?.loads[i] ?? 0;
                    const realLoad = solveRealized?.loads[i] ?? 0;
                    const nomFp = solveNominal?.fingerprint[i] ?? 0;
                    const realFp = solveRealized?.fingerprint[i] ?? 0;
                    const diffFp = Math.abs(nomFp - realFp);

                    return (
                      <tr key={name}>
                        <td className="py-1 font-bold text-slate-300">{name}</td>
                        <td className="py-1 text-right text-slate-400">
                          {nomLoad.toFixed(1)} N
                        </td>
                        <td className="py-1 text-right text-slate-200">
                          {realLoad.toFixed(1)} N
                        </td>
                        <td className="py-1 text-right text-slate-400">
                          {(realLoad - nomLoad).toFixed(1)} N
                        </td>
                        <td
                          className={`py-1 text-right font-bold ${
                            diffFp > 0.05 ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {(diffFp * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pattern Induction Action Button */}
            {error > 0.1 && (
              <button
                id="probelab-induce-pattern-btn"
                onClick={handleCreatePattern}
                className="mt-3 w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>INDUCE RELATIONSHIP PATTERN FROM MISMATCH</span>
              </button>
            )}
          </div>

          {/* Tunable Defects Configuration Panel */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                  Tunable In-Silico Defects
                </h3>
                <p className="text-[11px] text-slate-500">
                  Simulate mechanical play, micro-gaps, and joint slack
                </p>
              </div>
            </div>

            {/* Defect Presets */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => {
                  onUpdateDefects([
                    {
                      member: 4, // M5 diagonal
                      gap: 0.00002, // 20 um
                      stiffnessFraction: 0.35,
                      loadCases: ["LC-1", "LC-3"],
                      mustBeActive: [0, 1], // M1, M2
                      mustBeInactive: [],
                      enabled: true,
                    },
                  ]);
                }}
                className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] font-mono text-sky-400 border border-slate-800 cursor-pointer"
              >
                + Preset: M5 Slack Gap
              </button>
              <button
                onClick={() => {
                  onUpdateDefects([
                    {
                      member: 1, // M2 right chord
                      gap: 0,
                      stiffnessFraction: 0.15,
                      loadCases: ["LC-2", "LC-3"],
                      mustBeActive: [],
                      mustBeInactive: [],
                      enabled: true,
                    },
                  ]);
                }}
                className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] font-mono text-amber-400 border border-slate-800 cursor-pointer"
              >
                + Preset: M2 Compliance
              </button>
              <button
                onClick={() => onUpdateDefects([])}
                className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-800 cursor-pointer"
              >
                Clear Defects
              </button>
            </div>

            {/* Current Defects List */}
            <div className="space-y-2 mb-3 max-h-[160px] overflow-y-auto">
              {defects.map((d, index) => (
                <div
                  key={index}
                  className="p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={() => handleToggleDefect(index)}
                      className="accent-amber-500 rounded"
                      title="Toggle defect enabled"
                    />
                    <div>
                      <span className="font-bold text-amber-400">
                        {MEMBER_NAMES[d.member]}: Gap {(d.gap * 1e6).toFixed(0)} μm
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        EA × {d.stiffnessFraction.toFixed(2)} · Case: {d.loadCases.join(", ")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDefect(index)}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {defects.length === 0 && (
                <p className="text-xs text-slate-500 font-mono italic text-center py-2">
                  No active defects. Structure behaves nominally.
                </p>
              )}
            </div>

            {/* Add Defect Form */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-500 block">Member</label>
                <select
                  value={newDefectMember}
                  onChange={(e) => setNewDefectMember(Number(e.target.value))}
                  className="w-full mt-1 p-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                >
                  {MEMBER_NAMES.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block">Gap (μm)</label>
                <input
                  type="number"
                  step="5"
                  value={(newDefectGap * 1e6).toFixed(0)}
                  onChange={(e) => setNewDefectGap(Number(e.target.value) / 1e6)}
                  className="w-full mt-1 p-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block">Stiffness %</label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="100"
                  value={(newDefectStiffness * 100).toFixed(0)}
                  onChange={(e) => setNewDefectStiffness(Number(e.target.value) / 100)}
                  className="w-full mt-1 p-1 rounded bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="col-span-3">
                <button
                  id="probelab-add-defect-btn"
                  onClick={handleAddDefect}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tunable Defect</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
