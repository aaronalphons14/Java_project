import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/lab/TopBar";
import { NavTabs } from "@/components/lab/NavTabs";
import { DashboardView } from "@/components/lab/DashboardView";
import { ProbeLabView } from "@/components/lab/ProbeLabView";
import { StructuralMemoryView } from "@/components/lab/StructuralMemoryView";
import { SearchSpaceView } from "@/components/lab/SearchSpaceView";
import { ProcessView } from "@/components/lab/ProcessView";
import { EventLogView } from "@/components/lab/EventLogView";
import { HardwareView } from "@/components/lab/HardwareView";
import { BenchmarkView } from "@/components/lab/BenchmarkView";
import { EvidenceDossierView } from "@/components/lab/EvidenceDossierView";

import type { LabViewId, SafetyState, SimulationMode } from "@/components/lab/types";
import {
  solveTruss,
  solveRealized,
  l1Error,
  DEFAULT_TOPLOGY_MASK,
  LOAD_CASES,
  type LoadCaseId,
  type Defect,
} from "@/lib/lab/solver";
import {
  matchesPattern,
  enumerateMasks,
  type Pattern,
} from "@/lib/lab/patterns";
import { readLocal, writeLocal, type LabEvent } from "@/lib/lab/storage";

export const Route = createFileRoute("/")({
  component: LoadTopologyLab,
});

const DEFAULT_PATTERNS: Pattern[] = [
  {
    id: "pat-init-m5-launch",
    mustBeActive: [0, 1], // M1, M2
    mustBeInactive: [4], // M5
    loadCase: "LC-1",
    boundaryCondition: "J1 pinned · J2 roller",
    structuralState: "Nominal ambient · quasi-static",
    responseSignature: [0.35, 0.42, 0.12, 0.05, 0.06, 0.0],
    verdict: "unsafe",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    source: "sim",
    supportCount: 5,
    violationCount: 0,
    verifiedCount: 4,
    refinements: [
      "Initial in-silico characterization of M5 joint engagement under launch axial load.",
    ],
  },
  {
    id: "pat-init-m2-shear",
    mustBeActive: [2, 3], // M3, M4
    mustBeInactive: [1], // M2
    loadCase: "LC-3",
    boundaryCondition: "J1 pinned · J2 roller",
    structuralState: "Nominal ambient · quasi-static",
    responseSignature: [0.22, 0.0, 0.38, 0.25, 0.15, 0.0],
    verdict: "unsafe",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    source: "sim",
    supportCount: 3,
    violationCount: 0,
    verifiedCount: 2,
    refinements: ["Shear asymmetry constraint induction."],
  },
];

const DEFAULT_DEFECTS: Defect[] = [
  {
    member: 4, // M5 diagonal
    gap: 0.00002, // 20 um
    stiffnessFraction: 0.35,
    loadCases: ["LC-1", "LC-3"],
    mustBeActive: [0, 1],
    mustBeInactive: [],
    enabled: true,
  },
];

const INITIAL_EVENTS: LabEvent[] = [
  {
    id: "evt-init-0",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    source: "system",
    type: "SYSTEM_INITIALIZED",
    message: "Load Topology Lab workbench v1.0 initialized in browser storage.",
  },
  {
    id: "evt-init-1",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    source: "sim",
    type: "PATTERN_INDUCED",
    message: "Inductive rule pat-init-m5-launch synthesized from M5 gap engagement under LC-1.",
  },
];

function LoadTopologyLab() {
  // Navigation
  const [currentView, setCurrentView] = useState<LabViewId>("dashboard");

  // Topology State
  const [mask, setMask] = useState<number>(() => {
    const saved = readLocal<number>("LOAD_TOPOLOGY_MASK", DEFAULT_TOPLOGY_MASK);
    return saved > 0 && saved < 64 ? saved : DEFAULT_TOPLOGY_MASK;
  });
  const [activeLoadCase, setActiveLoadCase] = useState<LoadCaseId>(() =>
    readLocal<LoadCaseId>("LOAD_TOPOLOGY_LOAD_CASE", "LC-1")
  );

  // Safety & Operating Mode
  const [safetyState, setSafetyState] = useState<SafetyState>("normal");
  const [simulationMode, setSimulationMode] = useState<SimulationMode>("sim");

  // Engineering Data State
  const [defects, setDefects] = useState<Defect[]>(() =>
    readLocal<Defect[]>("LOAD_TOPOLOGY_DEFECTS", DEFAULT_DEFECTS)
  );
  const [patterns, setPatterns] = useState<Pattern[]>(() =>
    readLocal<Pattern[]>("LOAD_TOPOLOGY_PATTERNS", DEFAULT_PATTERNS)
  );
  const [events, setEvents] = useState<LabEvent[]>(() =>
    readLocal<LabEvent[]>("LOAD_TOPOLOGY_EVENTS", INITIAL_EVENTS)
  );
  const [jointCompliance, setJointCompliance] = useState<number[]>([0, 0, 0, 0]);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    writeLocal("LOAD_TOPOLOGY_MASK", mask);
  }, [mask]);

  useEffect(() => {
    writeLocal("LOAD_TOPOLOGY_LOAD_CASE", activeLoadCase);
  }, [activeLoadCase]);

  useEffect(() => {
    writeLocal("LOAD_TOPOLOGY_DEFECTS", defects);
  }, [defects]);

  useEffect(() => {
    writeLocal("LOAD_TOPOLOGY_PATTERNS", patterns);
  }, [patterns]);

  useEffect(() => {
    writeLocal("LOAD_TOPOLOGY_EVENTS", events);
  }, [events]);

  // Event logger helper
  const logEvent = useCallback(
    (source: "sim" | "hardware" | "system", type: string, message: string, data?: unknown) => {
      const newEvt: LabEvent = {
        id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        source,
        type,
        message,
        data,
      };
      setEvents((prev) => [newEvt, ...prev.slice(0, 199)]);
    },
    []
  );

  // Solvers: Nominal & Realized
  const solveNominal = useMemo(() => {
    return solveTruss(mask, activeLoadCase, undefined, jointCompliance);
  }, [mask, activeLoadCase, jointCompliance]);

  const solveRealizedResult = useMemo(() => {
    return solveRealized(mask, activeLoadCase, defects, undefined, jointCompliance);
  }, [mask, activeLoadCase, defects, jointCompliance]);

  // Compute L1 realization error
  const currentL1Error = useMemo(() => {
    return l1Error(solveNominal.fingerprint, solveRealizedResult.fingerprint);
  }, [solveNominal, solveRealizedResult]);

  // Check safety state on calculation
  useEffect(() => {
    if (safetyState === "safe-hold") return; // manual reset required
    const maxNom = Math.max(...solveNominal.loads.map(Math.abs));
    const maxReal = Math.max(...solveRealizedResult.loads.map(Math.abs));
    const highest = Math.max(maxNom, maxReal);

    if (highest > 110) {
      setSafetyState("warning");
    } else if (safetyState === "warning") {
      setSafetyState("normal");
    }
  }, [solveNominal, solveRealizedResult, safetyState]);

  // Active member count
  const activeMemberCount = useMemo(() => {
    return Array.from({ length: 6 }).filter((_, i) => Boolean(mask & (1 << i))).length;
  }, [mask]);

  // Count pruned topologies across search space
  const prunedCount = useMemo(() => {
    const all = enumerateMasks();
    return all.filter((m) =>
      patterns.some(
        (p) =>
          p.verdict === "unsafe" &&
          p.loadCase === activeLoadCase &&
          matchesPattern(m, p)
      )
    ).length;
  }, [patterns, activeLoadCase]);

  // Actions
  const handleRestoreNominal = () => {
    setMask(DEFAULT_TOPLOGY_MASK);
    logEvent(
      "system",
      "TOPOLOGY_RESTORED",
      `Nominal truss topology restored (Mask #${DEFAULT_TOPLOGY_MASK} - 110111, 5/6 members active)`
    );
  };

  const handleToggleMember = (index: number) => {
    const newMask = mask ^ (1 << index);
    const wasActive = Boolean(mask & (1 << index));
    setMask(newMask);
    logEvent(
      simulationMode === "live-hardware" ? "hardware" : "sim",
      "TOPOLOGY_ACTUATED",
      `Member M${index + 1} ${wasActive ? "released" : "locked"} (Commanded Mask: #${newMask})`,
      { previousMask: mask, newMask, member: index, active: !wasActive }
    );
  };

  const handleSelectLoadCase = (lc: LoadCaseId) => {
    setActiveLoadCase(lc);
    logEvent(
      "system",
      "LOAD_CASE_CHANGED",
      `Active qualification load case switched to ${lc}`,
      { loadCase: lc }
    );
  };

  const handleExecuteProbe = () => {
    if (safetyState === "safe-hold") {
      alert("Cannot execute probe while in SAFE-HOLD. Clear E-STOP first.");
      return;
    }
    setIsProbing(true);
    logEvent(
      simulationMode === "live-hardware" ? "hardware" : "sim",
      "PROBE_INITIATED",
      `Applying test load on joint J3 under ${activeLoadCase}`,
      { mask, loadCase: activeLoadCase }
    );

    setTimeout(() => {
      setIsProbing(false);
      logEvent(
        simulationMode === "live-hardware" ? "hardware" : "sim",
        "PROBE_COMPLETED",
        `Probe completed. L1 Error = ${currentL1Error.toFixed(4)} vs commanded model.`,
        {
          error: currentL1Error,
          nominalFp: solveNominal.fingerprint,
          realizedFp: solveRealizedResult.fingerprint,
        }
      );
    }, 600);
  };

  const handleEmergencyStop = () => {
    setSafetyState("safe-hold");
    logEvent(
      "system",
      "SAFE_HOLD_TRIGGERED",
      "EMERGENCY STOP (E-STOP) actuated! Actuators held in safe state.",
      { mask, loadCase: activeLoadCase }
    );
  };

  const handleResetSafety = () => {
    setSafetyState("normal");
    logEvent(
      "system",
      "SAFE_HOLD_CLEARED",
      "Safety interlock reset. Normal workbench operations resumed."
    );
  };

  const handleInducePattern = (pattern: Pattern) => {
    setPatterns((prev) => [pattern, ...prev]);
    logEvent(
      pattern.source,
      "PATTERN_INDUCED",
      `New relationship pattern ${pattern.id} synthesized (${pattern.verdict} under ${pattern.loadCase}).`,
      pattern
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Header Bar */}
      <TopBar
        mask={mask}
        activeLoadCase={activeLoadCase}
        safetyState={safetyState}
        simulationMode={simulationMode}
        onEmergencyStop={handleEmergencyStop}
        onResetSafety={handleResetSafety}
        onSelectMode={setSimulationMode}
        activeMemberCount={activeMemberCount}
      />

      {/* Navigation Sections Bar */}
      <NavTabs
        currentView={currentView}
        onSelectView={setCurrentView}
        prunedCount={prunedCount}
        patternsCount={patterns.length}
        eventsCount={events.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-16">
        {currentView === "dashboard" && (
          <DashboardView
            mask={mask}
            activeLoadCase={activeLoadCase}
            solveNominal={solveNominal}
            solveRealized={solveRealizedResult}
            defects={defects}
            patterns={patterns}
            events={events}
            prunedCount={prunedCount}
            onToggleMember={handleToggleMember}
            onSelectLoadCase={handleSelectLoadCase}
            onExecuteProbe={handleExecuteProbe}
            onRestoreNominal={handleRestoreNominal}
            onNavigate={setCurrentView}
            isProbing={isProbing}
          />
        )}

        {currentView === "probelab" && (
          <ProbeLabView
            mask={mask}
            activeLoadCase={activeLoadCase}
            solveNominal={solveNominal}
            solveRealized={solveRealizedResult}
            defects={defects}
            jointCompliance={jointCompliance}
            onToggleMember={handleToggleMember}
            onSelectLoadCase={handleSelectLoadCase}
            onUpdateDefects={setDefects}
            onUpdateJointCompliance={setJointCompliance}
            onExecuteProbe={handleExecuteProbe}
            onRestoreNominal={handleRestoreNominal}
            onInducePattern={handleInducePattern}
            isProbing={isProbing}
            simulationMode={simulationMode}
          />
        )}

        {currentView === "memory" && (
          <StructuralMemoryView
            patterns={patterns}
            onUpdatePatterns={setPatterns}
            mask={mask}
          />
        )}

        {currentView === "searchspace" && (
          <SearchSpaceView
            currentMask={mask}
            patterns={patterns}
            activeLoadCase={activeLoadCase}
            onSelectMask={(newMask) => {
              setMask(newMask);
              logEvent(
                "system",
                "TOPOLOGY_SELECTED",
                `Commanded topology mask switched to #${newMask} from search space`,
                { mask: newMask }
              );
            }}
            onSelectLoadCase={handleSelectLoadCase}
          />
        )}

        {currentView === "process" && <ProcessView />}

        {currentView === "eventlog" && (
          <EventLogView
            events={events}
            onClearEvents={() => setEvents([])}
            onAddEvent={(evt) => logEvent(evt.source, evt.type, evt.message, evt.data)}
          />
        )}

        {currentView === "hardware" && (
          <HardwareView
            mask={mask}
            simulationMode={simulationMode}
            onSelectMode={setSimulationMode}
            onEmergencyStop={handleEmergencyStop}
            onResetSafety={handleResetSafety}
            isSafeHold={safetyState === "safe-hold"}
          />
        )}

        {currentView === "benchmark" && <BenchmarkView />}

        {currentView === "evidence" && <EvidenceDossierView />}
      </main>

      {/* Global Status Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-900 py-3 px-4 text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span>LOAD TOPOLOGY LAB · ARCHITECTURE VERIFIED</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            Status: {safetyState.toUpperCase()} · Mode: {simulationMode.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>L1 Error: {currentL1Error.toFixed(4)}</span>
          <span>Pruned: {prunedCount}/64</span>
          <span>Rules: {patterns.length}</span>
        </div>
      </footer>
    </div>
  );
}
