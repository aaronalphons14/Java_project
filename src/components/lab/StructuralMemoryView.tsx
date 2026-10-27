import React, { useState } from "react";
import {
  BrainCircuit,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Sparkles,
  GitBranch,
} from "lucide-react";
import {
  soundnessRate,
  recordVerification,
  recordSupportingTest,
  type Pattern,
  type Verdict,
} from "@/lib/lab/patterns";
import { MEMBER_NAMES, LOAD_CASES, type LoadCaseId } from "@/lib/lab/solver";
import { downloadFile } from "@/lib/lab/storage";

interface StructuralMemoryViewProps {
  patterns: Pattern[];
  onUpdatePatterns: (patterns: Pattern[]) => void;
  mask: number;
}

export const StructuralMemoryView: React.FC<StructuralMemoryViewProps> = ({
  patterns,
  onUpdatePatterns,
  mask,
}) => {
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [testMaskInput, setTestMaskInput] = useState(mask);

  // Manual rule creator state
  const [newRequiredActive, setNewRequiredActive] = useState<number[]>([]);
  const [newRequiredInactive, setNewRequiredInactive] = useState<number[]>([]);
  const [newLoadCase, setNewLoadCase] = useState<LoadCaseId>("LC-1");
  const [newVerdict, setNewVerdict] = useState<Verdict>("unsafe");

  const overallSoundness = soundnessRate(patterns);

  const handleVerify = (patternId: string, matchesPrediction: boolean) => {
    const updated = patterns.map((p) => {
      if (p.id !== patternId) return p;
      return recordVerification(p, matchesPrediction, testMaskInput);
    });
    onUpdatePatterns(updated);
  };

  const handleSupport = (patternId: string) => {
    const updated = patterns.map((p) => {
      if (p.id !== patternId) return p;
      return recordSupportingTest(p);
    });
    onUpdatePatterns(updated);
  };

  const handleDelete = (patternId: string) => {
    onUpdatePatterns(patterns.filter((p) => p.id !== patternId));
  };

  const handleAddManualPattern = () => {
    const pattern: Pattern = {
      id: `pat-manual-${Date.now().toString(36)}`,
      mustBeActive: [...newRequiredActive],
      mustBeInactive: [...newRequiredInactive],
      loadCase: newLoadCase,
      boundaryCondition: "J1 pinned · J2 roller",
      structuralState: "Nominal ambient · quasi-static",
      responseSignature: [0, 0, 0, 0, 0, 0],
      verdict: newVerdict,
      timestamp: new Date().toISOString(),
      source: "sim",
      supportCount: 1,
      violationCount: 0,
      verifiedCount: 0,
      refinements: ["Manually defined inductive constraint."],
    };
    onUpdatePatterns([pattern, ...patterns]);
    setNewRequiredActive([]);
    setNewRequiredInactive([]);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(patterns, null, 2);
    downloadFile(`load-topology-patterns-${Date.now()}.json`, json, "application/json");
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            STRUCTURAL MEMORY & CONTEXTUAL PATTERNS
          </h2>
          <p className="text-xs text-slate-400">
            Compact relationship rules learned from sensor mismatches. Prunes invalid topologies
            across load cases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <span className="text-slate-500">Prune Soundness:</span>{" "}
            <span className="font-bold text-indigo-400">
              {(overallSoundness * 100).toFixed(1)}%
            </span>
          </div>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Patterns JSON</span>
          </button>
        </div>
      </div>

      {/* Patterns Table */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Active Relationship Rules ({patterns.length})
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Format: p = ⟨Active, Inactive, LoadCase, Verdict⟩
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 px-2">ID / Time</th>
                <th className="py-2 px-2">Source</th>
                <th className="py-2 px-2">Required Active</th>
                <th className="py-2 px-2">Required Inactive</th>
                <th className="py-2 px-2">Context</th>
                <th className="py-2 px-2">Verdict</th>
                <th className="py-2 px-2 text-center">Tests</th>
                <th className="py-2 px-2 text-center">Soundness</th>
                <th className="py-2 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {patterns.map((p) => {
                const isSelected = selectedPatternId === p.id;
                const patternSoundness =
                  p.verifiedCount === 0
                    ? 1
                    : (p.verifiedCount - p.violationCount) / p.verifiedCount;

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? "bg-slate-800/60" : ""
                      }`}
                      onClick={() => setSelectedPatternId(isSelected ? null : p.id)}
                    >
                      <td className="py-2 px-2 font-bold text-slate-300">{p.id.slice(0, 14)}...</td>
                      <td className="py-2 px-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            p.source === "hardware"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-indigo-950 text-indigo-400 border border-indigo-800"
                          }`}
                        >
                          {p.source}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {p.mustBeActive.length > 0 ? (
                          <div className="flex gap-1">
                            {p.mustBeActive.map((m) => (
                              <span
                                key={m}
                                className="px-1 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px]"
                              >
                                {MEMBER_NAMES[m]}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {p.mustBeInactive.length > 0 ? (
                          <div className="flex gap-1">
                            {p.mustBeInactive.map((m) => (
                              <span
                                key={m}
                                className="px-1 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px]"
                              >
                                {MEMBER_NAMES[m]}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-amber-300 font-semibold">{p.loadCase}</td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.verdict === "unsafe"
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          }`}
                        >
                          {p.verdict}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400">
                        {p.supportCount} sup · {p.verifiedCount} ver ·{" "}
                        <span className="text-rose-400 font-bold">{p.violationCount} viol</span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-indigo-400">
                        {(patternSoundness * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleSupport(p.id)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[10px] cursor-pointer"
                            title="Add support count"
                          >
                            +Support
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Delete pattern"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Refinement Details Row */}
                    {isSelected && (
                      <tr className="bg-slate-950/70">
                        <td colSpan={9} className="p-3 text-xs font-mono space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                              <GitBranch className="w-3.5 h-3.5" />
                              Inductive Refinement History ({p.refinements.length} narrowings)
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Test against Mask:</span>
                              <input
                                type="number"
                                min="0"
                                max="63"
                                value={testMaskInput}
                                onChange={(e) => setTestMaskInput(Number(e.target.value))}
                                className="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200"
                              />
                              <button
                                onClick={() => handleVerify(p.id, true)}
                                className="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700 text-[10px] cursor-pointer"
                              >
                                Verified Agree
                              </button>
                              <button
                                onClick={() => handleVerify(p.id, false)}
                                className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-300 border border-rose-700 text-[10px] cursor-pointer"
                              >
                                Counterexample (Refine)
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            {p.refinements.map((ref, idx) => (
                              <div
                                key={idx}
                                className="text-[11px] text-slate-400 flex items-center gap-2"
                              >
                                <span className="text-indigo-400">#{idx + 1}</span>
                                <span>{ref}</span>
                              </div>
                            ))}
                            {p.refinements.length === 0 && (
                              <p className="text-[11px] text-slate-500 italic">
                                No verification disagreements recorded yet.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {patterns.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-500 font-mono italic">
                    No structural patterns recorded yet. Execute a probe resulting in mismatch or
                    add a rule below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Pattern Injection Panel */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
          Manual Pattern Definition (Inductive Rule Injection)
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Synthesize a relationship pattern specifying conditions that cause an unsafe or acceptable
          verdict under a load case.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Required Active Members</label>
            <div className="grid grid-cols-3 gap-1">
              {MEMBER_NAMES.map((name, i) => {
                const selected = newRequiredActive.includes(i);
                return (
                  <button
                    key={name}
                    onClick={() =>
                      setNewRequiredActive((prev) =>
                        selected ? prev.filter((x) => x !== i) : [...prev, i],
                      )
                    }
                    className={`py-1 rounded text-center text-[10px] font-bold border cursor-pointer ${
                      selected
                        ? "bg-sky-950 text-sky-300 border-sky-700"
                        : "bg-slate-950 text-slate-500 border-slate-800"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">
              Required Inactive Members
            </label>
            <div className="grid grid-cols-3 gap-1">
              {MEMBER_NAMES.map((name, i) => {
                const selected = newRequiredInactive.includes(i);
                return (
                  <button
                    key={name}
                    onClick={() =>
                      setNewRequiredInactive((prev) =>
                        selected ? prev.filter((x) => x !== i) : [...prev, i],
                      )
                    }
                    className={`py-1 rounded text-center text-[10px] font-bold border cursor-pointer ${
                      selected
                        ? "bg-rose-950 text-rose-300 border-rose-700"
                        : "bg-slate-950 text-slate-500 border-slate-800"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Load Case Context</label>
            <select
              value={newLoadCase}
              onChange={(e) => setNewLoadCase(e.target.value as LoadCaseId)}
              className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
            >
              {LOAD_CASES.map((lc) => (
                <option key={lc.id} value={lc.id}>
                  {lc.id}: {lc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Verdict</label>
            <div className="flex gap-2">
              <button
                onClick={() => setNewVerdict("unsafe")}
                className={`flex-1 py-2 rounded text-center font-bold text-xs border cursor-pointer ${
                  newVerdict === "unsafe"
                    ? "bg-rose-950 text-rose-300 border-rose-700"
                    : "bg-slate-950 text-slate-500 border-slate-800"
                }`}
              >
                UNSAFE
              </button>
              <button
                onClick={() => setNewVerdict("acceptable")}
                className={`flex-1 py-2 rounded text-center font-bold text-xs border cursor-pointer ${
                  newVerdict === "acceptable"
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : "bg-slate-950 text-slate-500 border-slate-800"
                }`}
              >
                ACCEPTABLE
              </button>
            </div>
          </div>

          <div className="sm:col-span-4">
            <button
              id="structural-memory-add-rule-btn"
              onClick={handleAddManualPattern}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>COMMIT RELATIONSHIP PATTERN TO MEMORY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
