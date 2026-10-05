import React, { useState } from "react";
import {
  BarChart3,
  Download,
  Play,
  RotateCcw,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  TrendingDown,
  Info,
} from "lucide-react";
import {
  runBenchmark,
  benchmarkCsv,
  benchmarkJson,
  type BenchmarkResult,
} from "@/lib/lab/benchmark";
import { downloadFile } from "@/lib/lab/storage";

export const BenchmarkView: React.FC = () => {
  const [trials, setTrials] = useState(100);
  const [seed, setSeed] = useState(202607);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(() => {
    // Initial deterministic quick run so the table isn't blank on first open
    try {
      return runBenchmark(50, 202607);
    } catch {
      return null;
    }
  });

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const res = runBenchmark(trials, seed);
        setResult(res);
      } finally {
        setIsRunning(false);
      }
    }, 50);
  };

  const handleExportCsv = () => {
    if (!result) return;
    const csv = benchmarkCsv(result);
    downloadFile(`load-topology-benchmark-${trials}trials.csv`, csv, "text/csv");
  };

  const handleExportJson = () => {
    if (!result) return;
    const json = benchmarkJson(result);
    downloadFile(`load-topology-benchmark-${trials}trials.json`, json, "application/json");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            FIVE-STRATEGY QUALIFICATION BENCHMARK
          </h2>
          <p className="text-xs text-slate-400">
            Monte Carlo statistical evaluation comparing search efficiency, false-prune rates, and safety qualification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="benchmark-export-csv-btn"
            onClick={handleExportCsv}
            disabled={!result}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            id="benchmark-export-json-btn"
            onClick={handleExportJson}
            disabled={!result}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Mandatory Evidence Provenance Banner */}
      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs font-mono text-amber-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider">
            Evidence Provenance Guarantee (simulated: true)
          </span>
          <p className="text-[11px] text-amber-300/80 mt-0.5">
            Per laboratory architecture specifications, all benchmark trials are computed via the browser-safe simulation harness with deterministic PRNG (mulberry32). Benchmarks are strictly labelled as synthetic evidence to prevent confusion with physical serial hardware logs.
          </p>
        </div>
      </div>

      {/* Benchmark Execution Parameters */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-slate-400 block mb-1">
              Monte Carlo Trials per Strategy: <span className="text-sky-400 font-bold">{trials}</span>
            </label>
            <input
              type="range"
              min="20"
              max="500"
              step="20"
              value={trials}
              onChange={(e) => setTrials(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">PRNG Random Seed:</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
            />
          </div>

          <div>
            <button
              id="benchmark-run-btn"
              onClick={handleRun}
              disabled={isRunning}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              <Play className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "RUNNING TRIALS..." : `RUN BENCHMARK (${trials * 5} TESTS)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Benchmark Results Summary Table */}
      {result && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Statistical Strategy Comparison ({result.trials} Trials · Seed #{result.seed})
            </h3>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
              simulated: true
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 px-2">Strategy</th>
                  <th className="py-2 px-2 text-right">Mean Tests</th>
                  <th className="py-2 px-2 text-right">Median</th>
                  <th className="py-2 px-2 text-right">p05 – p95</th>
                  <th className="py-2 px-2 text-right">Wrong Prune</th>
                  <th className="py-2 px-2 text-right">Missed Defect</th>
                  <th className="py-2 px-2 text-right">Qualified Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {result.summaries.map((s) => {
                  const isFull = s.strategy === "full";
                  return (
                    <tr
                      key={s.strategy}
                      className={isFull ? "bg-sky-950/30 font-semibold" : "hover:bg-slate-800/40"}
                    >
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          {isFull && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                          <span className={isFull ? "text-sky-300 font-bold" : "text-slate-200"}>
                            {s.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-100">
                        {s.mean.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">{s.median}</td>
                      <td className="py-2.5 px-2 text-right text-slate-400">
                        {s.p05} – {s.p95}
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-bold ${
                          s.wrongPruneRate > 0.05 ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {(s.wrongPruneRate * 100).toFixed(1)}%
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-bold ${
                          s.missedDefectRate > 0.05 ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {(s.missedDefectRate * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-sky-400">
                        {(s.qualifiedRate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Test Efficiency Visual Comparison Bars */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase">
              Average Number of Physical Tests Required to Qualify
            </h4>
            <div className="space-y-1.5">
              {result.summaries.map((s) => {
                const maxMean = Math.max(...result.summaries.map((x) => x.mean), 1);
                const pct = (s.mean / maxMean) * 100;
                const isFull = s.strategy === "full";
                return (
                  <div key={s.strategy} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-48 truncate text-slate-300">{s.label}:</span>
                    <div className="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isFull ? "bg-sky-400" : "bg-slate-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`w-12 text-right font-bold ${isFull ? "text-sky-400" : "text-slate-400"}`}>
                      {s.mean.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
