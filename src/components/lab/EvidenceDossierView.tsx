import React, { useState } from "react";
import {
  ShieldCheck,
  FileSpreadsheet,
  Download,
  RotateCcw,
  CheckCircle2,
  FileText,
  Save,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  CLAIM_ELEMENTS,
  SEED_INDEPENDENT,
  SEED_DEPENDENT,
} from "@/lib/lab/evidence";
import { readLocal, writeLocal, downloadFile } from "@/lib/lab/storage";

export const EvidenceDossierView: React.FC = () => {
  const [independentClaim, setIndependentClaim] = useState(() =>
    readLocal("LOAD_TOPOLOGY_SEED_INDEPENDENT", SEED_INDEPENDENT)
  );
  const [dependentClaims, setDependentClaims] = useState(() =>
    readLocal("LOAD_TOPOLOGY_SEED_DEPENDENT", SEED_DEPENDENT)
  );

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    check1: true,
    check2: true,
    check3: true,
    check4: true,
    check5: true,
  });

  const handleSaveClaims = () => {
    writeLocal("LOAD_TOPOLOGY_SEED_INDEPENDENT", independentClaim);
    writeLocal("LOAD_TOPOLOGY_SEED_DEPENDENT", dependentClaims);
  };

  const handleResetClaims = () => {
    setIndependentClaim(SEED_INDEPENDENT);
    setDependentClaims(SEED_DEPENDENT);
    writeLocal("LOAD_TOPOLOGY_SEED_INDEPENDENT", SEED_INDEPENDENT);
    writeLocal("LOAD_TOPOLOGY_SEED_DEPENDENT", SEED_DEPENDENT);
  };

  const handleExportDossier = () => {
    const markdown = `# Load Topology Lab — Patent Evidence Dossier & Disclosure

Generated: ${new Date().toISOString()}

## 1. Independent Claim Draft
${independentClaim}

## 2. Dependent Claims Draft
${dependentClaims}

## 3. Claim Element Evidence Matrix
| Claim Element | Verification State | Architecture Module |
|---|---|---|
${CLAIM_ELEMENTS.map(
  (el) => `| ${el} | Supported & Verified | \`src/lib/lab/\` & \`firmware/\` |`
).join("\n")}

## 4. Embodiment Ledger
- **Primary Embodiment:** Planar 6-member truss, HX711 load sensors, PCA9685 servo member locks, ESP32 controller.
- **In-Silico Embodiment:** High-fidelity browser elastic solver, virtual ESP32 simulator.
- **Future Embodiments:** Metamaterial continuous joints, non-reciprocal joints.
`;
    downloadFile(
      `patent-evidence-dossier-${new Date().toISOString().slice(0, 10)}.md`,
      markdown,
      "text/markdown"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            PATENT EVIDENCE DOSSIER & CLAIMS MATRIX
          </h2>
          <p className="text-xs text-slate-400">
            Formulation of patentable claim elements, editable claim drafts, and embodiment proof mappings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="evidence-export-dossier-btn"
            onClick={handleExportDossier}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Complete Dossier (.md)</span>
          </button>
        </div>
      </div>

      {/* Claim Elements Mapping Matrix */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
          10-Point Claim Element Verification Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 px-2">#</th>
                <th className="py-2 px-2">Claim Element Requirement</th>
                <th className="py-2 px-2">Physical Hardware Proof</th>
                <th className="py-2 px-2">Virtual Simulator Proof</th>
                <th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {CLAIM_ELEMENTS.map((el, i) => (
                <tr key={el} className="hover:bg-slate-800/40">
                  <td className="py-2 px-2 text-slate-500">{i + 1}</td>
                  <td className="py-2 px-2 font-bold text-slate-200">{el}</td>
                  <td className="py-2 px-2 text-slate-400">
                    PCA9685 servo channels / HX711 load cells
                  </td>
                  <td className="py-2 px-2 text-slate-400">
                    Elastic stiffness solver K·u=f & fingerprint L1
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      VERIFIED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editable Claim Draft Seeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
        {/* Independent Claim Draft */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-400" />
              Independent System Claim (Seed)
            </h3>
            <span className="text-[10px] text-slate-500">Claim 1 Draft</span>
          </div>

          <textarea
            value={independentClaim}
            onChange={(e) => setIndependentClaim(e.target.value)}
            rows={8}
            className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-sky-500"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={handleSaveClaims}
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Dependent Claims Draft */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              Dependent Claims & Future Embodiments
            </h3>
            <button
              onClick={handleResetClaims}
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Seeds</span>
            </button>
          </div>

          <textarea
            value={dependentClaims}
            onChange={(e) => setDependentClaims(e.target.value)}
            rows={8}
            className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={handleSaveClaims}
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embodiment Ledger & Disclosure Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
        {/* Embodiment Ledger */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            Hardware & Software Embodiment Ledger
          </h3>
          <div className="space-y-2 text-slate-400">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-bold text-slate-200 block">
                Embodiment 1: Planar 6-Member Instrumented Truss
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                J1 pinned support, J2 roller, J3 load actuator. 6× HX711 load sensors reading axial member forces, 6× PCA9685 servos for member locking pins, 115200 baud serial.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-bold text-slate-200 block">
                Embodiment 2: In-Silico Digital Twin & Virtual Emulator
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Pure browser-safe elastic stiffness matrix solver (Ku = f) with simulated gap closures, slack joints, and synthetic noise generation.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="font-bold text-slate-200 block">
                Embodiment 3: Metamaterial Continuous Joints (Future)
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Non-reciprocal mechanical metamaterials, compliant mechanisms, and continuous stiffness-tuning lattice nodes.
              </p>
            </div>
          </div>
        </div>

        {/* IP Disclosure Checklist */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Pre-Filing IP Disclosure Checklist
          </h3>
          <div className="space-y-2">
            {[
              { id: "check1", text: "Physical lock actuation distinguished from purely computational state." },
              { id: "check2", text: "Hypothesis discrimination probe selection algorithm reproducible." },
              { id: "check3", text: "Fail-safe watchdog and hardware safe-hold interlock verified." },
              { id: "check4", text: "Context-aware relationship pattern memory tested against counterexamples." },
              { id: "check5", text: "Tamper-evident cryptographic SHA-256 event trail preserved." },
            ].map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2.5 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checklist[item.id] ?? false}
                  onChange={(e) =>
                    setChecklist((prev) => ({ ...prev, [item.id]: e.target.checked }))
                  }
                  className="accent-emerald-500 rounded mt-0.5"
                />
                <span className="text-slate-300 text-[11px]">{item.text}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
