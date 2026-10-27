import type { LoadCaseId } from "./solver";

export type Verdict = "unsafe" | "acceptable" | "inconclusive";
export type EvidenceSource = "sim" | "hardware";
export type Pattern = {
  id: string;
  mustBeActive: number[];
  mustBeInactive: number[];
  loadCase: LoadCaseId;
  boundaryCondition: string;
  structuralState: string;
  responseSignature: number[];
  verdict: Verdict;
  timestamp: string;
  source: EvidenceSource;
  supportCount: number;
  violationCount: number;
  verifiedCount: number;
  refinements: string[];
};
export function matchesPattern(
  mask: number,
  pattern: Pick<Pattern, "mustBeActive" | "mustBeInactive">,
): boolean {
  return (
    pattern.mustBeActive.every((member) => Boolean(mask & (1 << member))) &&
    pattern.mustBeInactive.every((member) => !(mask & (1 << member)))
  );
}
export function prunesMask(mask: number, patterns: Pattern[], loadCase?: LoadCaseId): boolean {
  return patterns.some(
    (pattern) =>
      pattern.verdict === "unsafe" &&
      (!loadCase || pattern.loadCase === loadCase) &&
      matchesPattern(mask, pattern),
  );
}
export function enumerateMasks(): number[] {
  return Array.from({ length: 64 }, (_, i) => i);
}
export function makePattern(
  mask: number,
  loadCase: LoadCaseId,
  responseSignature: number[],
  verdict: Verdict,
  source: EvidenceSource = "sim",
): Pattern {
  return {
    id: `pat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    mustBeActive: Array.from({ length: 6 }, (_, i) => i).filter((i) => Boolean(mask & (1 << i))),
    mustBeInactive: Array.from({ length: 6 }, (_, i) => i).filter((i) => !(mask & (1 << i))),
    loadCase,
    boundaryCondition: "J1 pinned · J2 roller",
    structuralState: "Nominal ambient · quasi-static",
    responseSignature: [...responseSignature],
    verdict,
    timestamp: new Date().toISOString(),
    source,
    supportCount: 1,
    violationCount: 0,
    verifiedCount: 0,
    refinements: [],
  };
}
export function recordSupportingTest(pattern: Pattern): Pattern {
  return { ...pattern, supportCount: pattern.supportCount + 1 };
}
export function recordVerification(
  pattern: Pattern,
  matchesPrediction: boolean,
  observedMask: number,
): Pattern {
  const verifiedCount = pattern.verifiedCount + 1;
  if (matchesPrediction) return { ...pattern, verifiedCount };
  const current = new Set([...pattern.mustBeActive, ...pattern.mustBeInactive]);
  const differentiators = Array.from({ length: 6 }, (_, i) => i).filter((i) => !current.has(i));
  // Refine deterministically with the first unconstrained condition that is
  // true in the observed counterexample. Never narrow away that counterexample.
  const member =
    differentiators.find((i) => Boolean(observedMask & (1 << i))) ?? differentiators[0];
  if (member === undefined)
    return { ...pattern, verifiedCount, violationCount: pattern.violationCount + 1 };
  const active = Boolean(observedMask & (1 << member));
  const refined = {
    ...pattern,
    verifiedCount,
    violationCount: pattern.violationCount + 1,
    ...(!active
      ? { mustBeActive: [...pattern.mustBeActive, member] }
      : { mustBeInactive: [...pattern.mustBeInactive, member] }),
    refinements: [
      ...pattern.refinements,
      `Added M${member + 1} ${!active ? "active" : "inactive"} after verification disagreement.`,
    ],
  };
  return refined;
}
export function soundnessRate(patterns: Pattern[]): number {
  const count = patterns.reduce((n, p) => n + p.verifiedCount, 0);
  const violations = patterns.reduce((n, p) => n + p.violationCount, 0);
  return count === 0 ? 1 : (count - violations) / count;
}
export function selectDiscriminatingProbe(
  hypotheses: number[][],
): { index: number; separation: number; reason: string } | null {
  if (hypotheses.length < 2) return null;
  const width = Math.max(0, ...hypotheses.map((h) => h.length));
  let best = -1,
    bestSeparation = -1;
  for (let index = 0; index < width; index++) {
    const vals = hypotheses.map((h) => h[index] ?? 0);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const separation = vals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / vals.length;
    if (separation > bestSeparation) {
      best = index;
      bestSeparation = separation;
    }
  }
  return best < 0
    ? null
    : {
        index: best,
        separation: bestSeparation,
        reason: `M${best + 1} load best separates ${hypotheses.length} remaining hypotheses.`,
      };
}
