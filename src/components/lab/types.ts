import type { LoadCaseId, Defect, SolveResult, Vector } from "@/lib/lab/solver";
import type { Pattern } from "@/lib/lab/patterns";
import type { LabEvent } from "@/lib/lab/storage";

export type LabViewId =
  | "dashboard"
  | "probelab"
  | "memory"
  | "searchspace"
  | "process"
  | "eventlog"
  | "hardware"
  | "benchmark"
  | "evidence";

export type SafetyState = "normal" | "warning" | "safe-hold";

export type SimulationMode = "sim" | "virtual-esp32" | "live-hardware";

export interface LabState {
  view: LabViewId;
  topologyMask: number;
  activeLoadCase: LoadCaseId;
  safetyState: SafetyState;
  simulationMode: SimulationMode;
  jointCompliance: number[];
  defects: Defect[];
  patterns: Pattern[];
  events: LabEvent[];
  lastSolveNominal: SolveResult | null;
  lastSolveRealized: SolveResult | null;
  selectedMaskForInspection: number | null;
  isProbing: boolean;
  virtualEsp32Active: boolean;
  heartbeatAge: number;
}
