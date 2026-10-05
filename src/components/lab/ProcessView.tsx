import React, { useState } from "react";
import {
  GitFork,
  ArrowRight,
  CheckCircle2,
  Cpu,
  BrainCircuit,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";

export const ProcessView: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: 1,
      title: "Model Prediction",
      badge: "Elastic Stiffness K",
      icon: Cpu,
      description:
        "The controller computes the predicted internal forces and normalized structural fingerprint f_nom for commanded topology mask M under load case LC using linear elastic truss solver K u = f.",
      math: "K_{reduced} \\cdot u_{free} = f_{external} \\implies f_{nom} = |N_i| / \\sum |N_k|",
      actionDesc: "Assemble stiffness matrix and solve nodal displacements.",
    },
    {
      step: 2,
      title: "Physical Actuation & Probing",
      badge: "PCA9685 Servos + HX711 Sensors",
      icon: GitFork,
      description:
        "Servo locks physically actuate the commanded member connectivity. The probe actuator applies a controlled test force at joint J3 while load cells read real-time member reaction forces.",
      math: "N_{realized} = \\frac{EA_i}{L_i} \\left( \\Delta u \\cdot c + \\Delta v \\cdot s \\right)",
      actionDesc: "Actuate mechanical locks and measure axial forces at ~10 Hz.",
    },
    {
      step: 3,
      title: "Fingerprint Error Computation",
      badge: "L1 Metric vs Threshold ε",
      icon: AlertTriangle,
      description:
        "Calculates the L1 difference between the commanded model fingerprint and the realized physical measurement. If error > ε (0.10), a structural realization mismatch or defect is flagged.",
      math: "e_{realization} = \\| f_{nom} - f_{real} \\|_1 = \\sum_{i=1}^6 |f_{nom,i} - f_{real,i}|",
      actionDesc: "Detect uncommanded gap closures, mechanical play, or buckled chords.",
    },
    {
      step: 4,
      title: "Inductive Context Pattern Synthesis",
      badge: "Contextual Rule Induction",
      icon: BrainCircuit,
      description:
        "Upon realization error, controller synthesizes a relationship pattern comprising required-active and required-inactive member conditions bound to the active load-case context.",
      math: "p = \\langle M_{active}, M_{inactive}, \\text{LoadCase}, \\text{verdict} = \\text{unsafe} \\rangle",
      actionDesc: "Store localized failure causality in persistent structural memory.",
    },
    {
      step: 5,
      title: "Search Space Pruning",
      badge: "Combinatorial Filter",
      icon: Layers,
      description:
        "Evaluates the remaining 64 topology hypotheses against the synthesized relationship pattern. Eliminates all candidate configurations matching the defect conditions under that load case.",
      math: "\\mathcal{M}_{pruned} = \\{ M \\in 2^6 \\mid \\text{matches}(M, p) \\land \\text{loadCase}(p) = LC \\}",
      actionDesc: "Safely prune invalid configurations without requiring physical destruction.",
    },
    {
      step: 6,
      title: "Pre-Failure Rejection & Safe Actuation",
      badge: "Qualification Gate",
      icon: ShieldCheck,
      description:
        "Subsequent operational topologies matching known failure patterns are rejected prior to applying full qualification loads, guaranteeing pre-failure safety.",
      math: "\\text{Command}(M) \\to \\begin{cases} \\text{Actuate locks} & M \\notin \\mathcal{M}_{pruned} \\\\ \\text{Reject / Safe-Hold} & M \\in \\mathcal{M}_{pruned} \\end{cases}",
      actionDesc: "Prevent structural collapse and preserve hardware integrity.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
            <GitFork className="w-5 h-5 text-sky-400" />
            CLOSED-LOOP TOPOLOGY ADAPTATION WORKFLOW
          </h2>
          <p className="text-xs text-slate-400">
            Patent-pending iterative loop connecting mechanical actuation, load sensing, contextual induction, and safe search pruning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Next Step ({activeStep + 1}/6)</span>
          </button>
          <button
            onClick={() => setActiveStep(0)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
            title="Reset to step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Navigator Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((st, i) => {
          const isCurrent = activeStep === i;
          const isDone = activeStep > i;
          return (
            <button
              key={st.step}
              onClick={() => setActiveStep(i)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isCurrent
                  ? "bg-sky-950/60 border-sky-500 shadow-md ring-1 ring-sky-500/50"
                  : isDone
                  ? "bg-slate-900/80 border-slate-800 text-slate-400"
                  : "bg-slate-950 border-slate-900 text-slate-600 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono font-bold ${
                    isCurrent ? "text-sky-400" : isDone ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  Step 0{st.step}
                </span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <h4 className="text-xs font-bold font-mono mt-1 text-slate-200 line-clamp-1">
                {st.title}
              </h4>
            </button>
          );
        })}
      </div>

      {/* Active Step Deep-Dive Card */}
      {(() => {
        const cur = steps[activeStep]!;
        const Icon = cur.icon;
        return (
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-sky-400 font-bold uppercase">
                      Stage 0{cur.step} of 06
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {cur.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-mono text-white">{cur.title}</h3>
                </div>
              </div>

              <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                {cur.actionDesc}
              </div>
            </div>

            <p className="text-sm font-sans text-slate-300 leading-relaxed">
              {cur.description}
            </p>

            {/* Mathematical Formulation */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-sky-300">
              <span className="text-[10px] text-slate-500 uppercase block mb-1">
                Governing Equation / Transformation:
              </span>
              <code>{cur.math}</code>
            </div>

            {/* Feedback Loop Explanation */}
            <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Next Stage in Closed Loop:</span>
              <button
                onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                className="text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Proceed to Step 0{((activeStep + 1) % steps.length) + 1}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
