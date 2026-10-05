import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Binary,
  Lightbulb,
  Crosshair,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  prunesMask,
  matchesPattern,
  enumerateMasks,
  selectDiscriminatingProbe,
  type Pattern,
} from "@/lib/lab/patterns";
import {
  solveTruss,
  MEMBER_NAMES,
  LOAD_CASES,
  type LoadCaseId,
} from "@/lib/lab/solver";

interface SearchSpaceViewProps {
  currentMask: number;
  patterns: Pattern[];
  activeLoadCase: LoadCaseId;
  onSelectMask: (mask: number) => void;
  onSelectLoadCase: (id: LoadCaseId) => void;
}

export const SearchSpaceView: React.FC<SearchSpaceViewProps> = ({
  currentMask,
  patterns,
  activeLoadCase,
  onSelectMask,
  onSelectLoadCase,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "viable" | "pruned">("all");
  const [inspectedMask, setInspectedMask] = useState<number>(currentMask);

  const allMasks = useMemo(() => enumerateMasks(), []);

  // Compute prunability for each mask under the active load case
  const maskStatusMap = useMemo(() => {
    const map = new Map<number, { isPruned: boolean; matchingPatterns: Pattern[] }>();
    for (const mask of allMasks) {
      const matching = patterns.filter(
        (p) =>
          p.verdict === "unsafe" &&
          p.loadCase === activeLoadCase &&
          matchesPattern(mask, p)
      );
      map.set(mask, {
        isPruned: matching.length > 0,
        matchingPatterns: matching,
      });
    }
    return map;
  }, [allMasks, patterns, activeLoadCase]);

  const prunedCount = useMemo(() => {
    let count = 0;
    for (const [, status] of maskStatusMap.entries()) {
      if (status.isPruned) count++;
    }
    return count;
  }, [maskStatusMap]);

  const viableMasks = useMemo(() => {
    return allMasks.filter((m) => !maskStatusMap.get(m)?.isPruned && m > 0);
  }, [allMasks, maskStatusMap]);

  // Discriminating probe analysis across viable candidates
  const discriminatingProbe = useMemo(() => {
    if (viableMasks.length < 2) return null;
    const hypotheses = viableMasks.map((m) => {
      const res = solveTruss(m, activeLoadCase);
      return res.fingerprint;
    });
    return selectDiscriminatingProbe(hypotheses);
  }, [viableMasks, activeLoadCase]);

  // Inspected mask solution
  const inspectedSolve = useMemo(() => {
    return solveTruss(inspectedMask, activeLoadCase);
  }, [inspectedMask, activeLoadCase]);

  const inspectedStatus = maskStatusMap.get(inspectedMask);

  const filteredMasks = allMasks.filter((mask) => {
    const isPruned = maskStatusMap.get(mask)?.isPruned;
    if (filterMode === "viable") return !isPruned;
    if (filterMode === "pruned") return isPruned;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Discrimination Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            TOPOLOGY SEARCH SPACE EXPLORER (64 COMBINATIONS)
          </h2>
          <p className="text-xs text-slate-400">
            Global hypothesis space (2⁶ = 64 topologies). Evaluates combinatorial pruning across load cases.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500">Filter Context:</span>
          {LOAD_CASES.map((lc) => (
            <button
              key={lc.id}
              onClick={() => onSelectLoadCase(lc.id)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeLoadCase === lc.id
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-950 text-slate-400 border border-slate-800"
              }`}
            >
              {lc.id}
            </button>
          ))}
        </div>
      </div>

      {/* Discriminating Probe Recommendation Card */}
      {discriminatingProbe && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-800/60 text-xs font-mono">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Crosshair className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sky-300">
                  OPTIMAL DISCRIMINATING PROBE SENSOR: MEMBER {MEMBER_NAMES[discriminatingProbe.index]}
                </span>
                <p className="text-slate-300 mt-1">
                  {discriminatingProbe.reason} Maximal hypothesis variance separation:{" "}
                  <span className="text-sky-400 font-bold">
                    {(discriminatingProbe.separation * 1000).toFixed(2)} × 10⁻³
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Probing this specific member under {activeLoadCase} provides maximum information gain to distinguish between remaining {viableMasks.length} viable topologies.
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded bg-sky-900/80 text-sky-200 border border-sky-700 whitespace-nowrap">
              PATENT CLAIM #1 ELEMENT
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: 64-Grid (8 cols) + Detail Inspection Drawer (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 64 Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            {/* Filter toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500 mr-1">Status:</span>
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    filterMode === "all"
                      ? "bg-slate-800 text-slate-100 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All (64)
                </button>
                <button
                  onClick={() => setFilterMode("viable")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    filterMode === "viable"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Viable ({64 - prunedCount})
                </button>
                <button
                  onClick={() => setFilterMode("pruned")}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    filterMode === "pruned"
                      ? "bg-rose-950 text-rose-300 border border-rose-800 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Pruned ({prunedCount})
                </button>
              </div>

              <div className="text-xs font-mono text-slate-400">
                Pruned under {activeLoadCase}:{" "}
                <span className="font-bold text-rose-400">{prunedCount} / 64</span> (
                {((prunedCount / 64) * 100).toFixed(0)}%)
              </div>
            </div>

            {/* 8x8 Grid of Masks */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {filteredMasks.map((m) => {
                const status = maskStatusMap.get(m);
                const isPruned = status?.isPruned;
                const isCurrent = m === currentMask;
                const isInspected = m === inspectedMask;
                const memberCount = Array.from({ length: 6 }).filter((_, i) =>
                  Boolean(m & (1 << i))
                ).length;

                return (
                  <button
                    key={m}
                    id={`mask-cell-${m}`}
                    onClick={() => setInspectedMask(m)}
                    className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                      isInspected
                        ? "ring-2 ring-sky-400 z-10"
                        : isCurrent
                        ? "border-sky-500 bg-sky-950/30"
                        : isPruned
                        ? "bg-rose-950/20 border-rose-900/60 text-slate-500 hover:border-rose-700"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-sky-400 rounded-full border-2 border-slate-950" />
                    )}

                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isPruned ? "text-rose-400 line-through" : "text-slate-200"
                        }`}
                      >
                        #{m}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {memberCount}M
                      </span>
                    </div>

                    <span className="text-[9px] font-mono text-slate-500 mt-1">
                      {m.toString(2).padStart(6, "0")}
                    </span>

                    <div className="mt-1 text-[9px] font-mono">
                      {isPruned ? (
                        <span className="text-rose-400 font-semibold">PRUNED</span>
                      ) : (
                        <span className="text-emerald-400">VIABLE</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Inspected Mask Details Drawer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Inspected Topology #{inspectedMask}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Binary: {inspectedMask.toString(2).padStart(6, "0")}
                </p>
              </div>

              {inspectedMask !== currentMask && (
                <button
                  id="searchspace-set-active-mask-btn"
                  onClick={() => onSelectMask(inspectedMask)}
                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Set as Active
                </button>
              )}
            </div>

            {/* Status Alert */}
            <div
              className={`p-2.5 rounded-lg border text-xs font-mono mb-3 ${
                inspectedStatus?.isPruned
                  ? "bg-rose-950/40 border-rose-800 text-rose-300"
                  : "bg-emerald-950/40 border-emerald-800 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {inspectedStatus?.isPruned ? (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold">
                    {inspectedStatus?.isPruned
                      ? `Pruned under ${activeLoadCase}`
                      : `Candidate Viable under ${activeLoadCase}`}
                  </span>
                  {inspectedStatus?.isPruned && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Excluded by {inspectedStatus.matchingPatterns.length} contextual pattern(s).
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stability & DOFs */}
            <div className="space-y-2 text-xs font-mono mb-3">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Stiffness Solvability:</span>
                <span
                  className={`font-bold ${
                    inspectedSolve.stable ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {inspectedSolve.stable ? "STABLE / DETERMINATE" : "MECHANISM / UNSTABLE"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-500">Active Members:</span>
                <span className="text-slate-200">
                  {Array.from({ length: 6 })
                    .filter((_, i) => Boolean(inspectedMask & (1 << i)))
                    .map((_, i) => MEMBER_NAMES[i])
                    .join(", ") || "None"}
                </span>
              </div>
            </div>

            {/* Member Loads Table for Inspected Mask */}
            <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
              Predicted Forces ({activeLoadCase})
            </h4>
            <div className="space-y-1 text-xs font-mono">
              {MEMBER_NAMES.map((name, i) => {
                const active = Boolean(inspectedMask & (1 << i));
                const load = inspectedSolve.loads[i] ?? 0;
                return (
                  <div
                    key={name}
                    className="flex justify-between items-center py-0.5 px-2 rounded bg-slate-950"
                  >
                    <span className={active ? "text-sky-400 font-bold" : "text-slate-600"}>
                      {name}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {active ? `${load.toFixed(1)} N` : "Released"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Matching Patterns List if Pruned */}
            {inspectedStatus?.isPruned && (
              <div className="mt-3 pt-2 border-t border-slate-800">
                <h4 className="text-[11px] font-mono font-bold text-rose-400 uppercase mb-1">
                  Excluding Pattern Rules
                </h4>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {inspectedStatus.matchingPatterns.map((pat) => (
                    <div
                      key={pat.id}
                      className="p-1.5 rounded bg-rose-950/30 border border-rose-900/60 text-[11px] font-mono text-rose-300"
                    >
                      <div className="font-bold">{pat.id}</div>
                      <div className="text-[10px] text-slate-400">
                        Req Active: {pat.mustBeActive.map((m) => MEMBER_NAMES[m]).join(",") || "—"} |
                        Req Inactive: {pat.mustBeInactive.map((m) => MEMBER_NAMES[m]).join(",") || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
