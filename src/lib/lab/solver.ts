import { gaussian, type Rng } from "./rng";

export type Vector = [number, number, number, number, number, number];
export type LoadCaseId = "LC-1" | "LC-2" | "LC-3" | "LC-4";
export type Member = { id: number; name: string; a: number; b: number; ea: number; active: boolean };
export type Defect = {
  member: number;
  gap: number;
  stiffnessFraction: number;
  loadCases: LoadCaseId[];
  mustBeActive: number[];
  mustBeInactive: number[];
  enabled: boolean;
};
export type SolveResult = { loads: Vector; fingerprint: Vector; displacement: number[]; stable: boolean };

export const LOAD_CASES: { id: LoadCaseId; label: string; description: string; force: [number, number] }[] = [
  { id: "LC-1", label: "Launch axial", description: "J3 → axial +Y", force: [0, 100] },
  { id: "LC-2", label: "Lateral", description: "J3 → lateral +X", force: [100, 0] },
  { id: "LC-3", label: "Shear", description: "J3 → shear 45°", force: [80, 80] },
  { id: "LC-4", label: "Low load", description: "J3 → 12 N proof", force: [0, 12] },
];
export const MEMBER_NAMES = ["M1", "M2", "M3", "M4", "M5", "M6"] as const;
export const MEMBER_ENDPOINTS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]];
export const MEMBER_DEFAULT_EA = [2.1e6, 2.1e6, 2.1e6, 2.1e6, 1.65e6, 1.65e6];
export const NODE_NAMES = ["J1", "J2", "J3", "J4"] as const;
export const NODE_POSITIONS: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
export const DEFAULT_TOPLOGY_MASK = 55;
export function membersFromMask(mask: number, stiffness: number[] = MEMBER_DEFAULT_EA): Member[] {
  return MEMBER_ENDPOINTS.map(([a, b], i) => ({ id: i, name: MEMBER_NAMES[i] ?? `M${i + 1}`, a, b, ea: stiffness[i] ?? 2e6, active: Boolean(mask & (1 << i)) }));
}
export function maskFromActive(active: boolean[]): number {
  return active.reduce((sum, value, i) => sum | (value ? 1 << i : 0), 0);
}
export function isMaskActive(mask: number, member: number): boolean { return Boolean(mask & (1 << member)); }

function solveLinear(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i] ?? 0]);
  for (let col = 0; col < n; col++) {
    let best = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row]?.[col] ?? 0) > Math.abs(a[best]?.[col] ?? 0)) best = row;
    [a[col], a[best]] = [a[best] ?? [], a[col] ?? []];
    const pivot = a[col]?.[col] ?? 0;
    if (Math.abs(pivot) < 1e-14) return null;
    for (let j = col; j <= n; j++) a[col]![j] = (a[col]?.[j] ?? 0) / pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row]?.[col] ?? 0;
      for (let j = col; j <= n; j++) a[row]![j] = (a[row]?.[j] ?? 0) - factor * (a[col]?.[j] ?? 0);
    }
  }
  return a.map(row => row[n] ?? 0);
}

function elasticSolve(mask: number, loadCase: LoadCaseId, ea: number[], extraMember?: number, extraStiffness = 0, jointCompliance: number[] = []): SolveResult {
  const ndof = 8, K = Array.from({ length: ndof }, () => Array(ndof).fill(0) as number[]);
  const stiffnesses: number[] = [], lengths: number[] = [];
  MEMBER_ENDPOINTS.forEach(([a, b], i) => {
    const length = Math.hypot((NODE_POSITIONS[b]?.[0] ?? 0) - (NODE_POSITIONS[a]?.[0] ?? 0), (NODE_POSITIONS[b]?.[1] ?? 0) - (NODE_POSITIONS[a]?.[1] ?? 0));
    lengths.push(length);
    const axial = (mask & (1 << i)) ? (ea[i] ?? 2e6) : i === extraMember ? extraStiffness : 0;
    stiffnesses.push(axial);
    if (axial <= 0) return;
    const dx = (NODE_POSITIONS[b]?.[0] ?? 0) - (NODE_POSITIONS[a]?.[0] ?? 0), dy = (NODE_POSITIONS[b]?.[1] ?? 0) - (NODE_POSITIONS[a]?.[1] ?? 0);
    const c = dx / length, s = dy / length, k = axial / length;
    const local = [[c*c,c*s,-c*c,-c*s],[c*s,s*s,-c*s,-s*s],[-c*c,-c*s,c*c,c*s],[-c*s,-s*s,c*s,s*s]];
    const indices = [2*a, 2*a+1, 2*b, 2*b+1];
    indices.forEach((row, ii) => indices.forEach((col, jj) => {
      const rowValues = K[row];
      if (rowValues) rowValues[col] = (rowValues[col] ?? 0) + k * (local[ii]?.[jj] ?? 0);
    }));
  });
  // Translational joint springs provide a stable, explicit compliance control.
  jointCompliance.forEach((compliance, node) => {
    const spring = compliance > 0 ? 1 / compliance : 0;
    if (spring > 0 && node < 4) {
      const horizontal = K[2 * node];
      const vertical = K[2 * node + 1];
      if (horizontal) horizontal[2 * node] = (horizontal[2 * node] ?? 0) + spring;
      if (vertical) vertical[2 * node + 1] = (vertical[2 * node + 1] ?? 0) + spring;
    }
  });
  const caseDef = LOAD_CASES.find(c => c.id === loadCase) ?? LOAD_CASES[0]!;
  const force = Array(8).fill(0) as number[];
  force[4] = caseDef.force[0]; force[5] = caseDef.force[1];
  // Pinned at J1, vertically guided at J2: the three rigid body DOFs are removed.
  const free = [2, 3, 4, 5, 6, 7];
  const reduced = free.map(i => free.map(j => K[i]?.[j] ?? 0));
  const scale = Math.max(1, ...reduced.map((row, i) => row[i] ?? 0));
  // A tiny numerical regularizer keeps near-mechanisms inspectable without
  // masking the displayed force-equilibrium warning.
  reduced.forEach((row, i) => { row[i] = (row[i] ?? 0) + scale * 1e-12; });
  const solved = solveLinear(reduced, free.map(i => force[i] ?? 0));
  const displacement = Array(ndof).fill(0) as number[];
  if (!solved) return { loads: [0,0,0,0,0,0], fingerprint: [0,0,0,0,0,0], displacement, stable: false };
  free.forEach((dof, i) => { displacement[dof] = solved[i] ?? 0; });
  const loads = MEMBER_ENDPOINTS.map(([a,b], i) => {
    const dx=(NODE_POSITIONS[b]?.[0]??0)-(NODE_POSITIONS[a]?.[0]??0),dy=(NODE_POSITIONS[b]?.[1]??0)-(NODE_POSITIONS[a]?.[1]??0),L=lengths[i]??1;
    const c=dx/L,s=dy/L,extension=(displacement[2*b]??0)-(displacement[2*a]??0)*c;
    const axialExtension=((displacement[2*b]??0)-(displacement[2*a]??0))*c+((displacement[2*b+1]??0)-(displacement[2*a+1]??0))*s;
    return stiffnesses[i] && L ? (stiffnesses[i] ?? 0) / L * axialExtension : 0;
  }) as Vector;
  const total = loads.reduce((sum, value) => sum + Math.abs(value), 0);
  const fingerprint = (total > 1e-9 ? loads.map(value => Math.abs(value) / total) : loads.map(() => 0)) as Vector;
  return { loads, fingerprint, displacement, stable: Boolean(solved) && total > 1e-9 };
}

export function solveTruss(mask: number, loadCase: LoadCaseId, ea: number[] = MEMBER_DEFAULT_EA, jointCompliance: number[] = []): SolveResult {
  return elasticSolve(mask, loadCase, ea, undefined, 0, jointCompliance);
}
export function solveRealized(mask: number, loadCase: LoadCaseId, defects: Defect[], ea: number[] = MEMBER_DEFAULT_EA, jointCompliance: number[] = []): SolveResult {
  const actual = new Set<number>();
  for (let round = 0; round < 3; round++) {
    const stiffness = ea.slice();
    actual.forEach(member => { stiffness[member] = (ea[member] ?? 2e6) * (defects.find(d => d.member === member)?.stiffnessFraction ?? 0.35); });
    const result = elasticSolve(mask, loadCase, stiffness, undefined, 0, jointCompliance);
    let changed = false;
    for (const defect of defects) {
      if (!defect.enabled || defect.member < 0 || defect.member > 5 || (mask & (1 << defect.member)) || !defect.loadCases.includes(loadCase)) continue;
      if (!defect.mustBeActive.every(member => Boolean(mask & (1 << member))) || defect.mustBeInactive.some(member => Boolean(mask & (1 << member)))) continue;
      const [a,b] = MEMBER_ENDPOINTS[defect.member] ?? [0,1];
      const dx=(NODE_POSITIONS[b]?.[0]??0)-(NODE_POSITIONS[a]?.[0]??0),dy=(NODE_POSITIONS[b]?.[1]??0)-(NODE_POSITIONS[a]?.[1]??0),length=Math.hypot(dx,dy),c=dx/length,s=dy/length;
      const extension=((result.displacement[2*b]??0)-(result.displacement[2*a]??0))*c+((result.displacement[2*b+1]??0)-(result.displacement[2*a+1]??0))*s;
      if (extension > defect.gap && !actual.has(defect.member)) { actual.add(defect.member); changed = true; }
    }
    if (!changed) return result;
  }
  const stiffness = ea.slice();
  actual.forEach(member => { stiffness[member] = (ea[member] ?? 2e6) * (defects.find(d => d.member === member)?.stiffnessFraction ?? 0.35); });
  return elasticSolve(mask, loadCase, stiffness, undefined, 0, jointCompliance);
}
export function l1Error(a: number[], b: number[]): number { return a.reduce((sum,value,i)=>sum+Math.abs(value-(b[i]??0)),0); }
export function measuredFingerprint(fingerprint: Vector, noise: number, rng: Rng): Vector {
  const noisy=fingerprint.map(value=>Math.max(0,value+gaussian(rng)*noise)) as Vector;
  const total=noisy.reduce((a,b)=>a+b,0);
  return (total>0?noisy.map(value=>value/total):[0,0,0,0,0,0]) as Vector;
}
