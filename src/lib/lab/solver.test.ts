import { describe, expect, it } from "vitest";
import {
  l1Error,
  membersFromMask,
  maskFromActive,
  solveTruss,
  solveRealized,
  measuredFingerprint,
} from "./solver";
import { mulberry32 } from "./rng";
describe("truss solver and fingerprints", () => {
  it("round-trips the six commanded members", () => {
    const members = membersFromMask(37);
    expect(maskFromActive(members.map((m) => m.active))).toBe(37);
    expect(members).toHaveLength(6);
  });
  it("normalizes nonzero member fingerprints", () => {
    const result = solveTruss(63, "LC-1");
    expect(result.stable).toBe(true);
    expect(result.fingerprint.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(result.fingerprint.every(Number.isFinite)).toBe(true);
  });
  it("reports the L1 topology difference", () =>
    expect(l1Error([0.4, 0.6], [0.1, 0.9])).toBeCloseTo(0.6));
  it("injects an engaged released member", () => {
    const defect = {
      member: 4,
      gap: 0,
      stiffnessFraction: 0.35,
      loadCases: ["LC-1" as const],
      mustBeActive: [],
      mustBeInactive: [],
      enabled: true,
    };
    const result = solveRealized(15, "LC-1", [defect]);
    expect(result.loads[4]).not.toBe(0);
  });
  it("shows a planted leak in the realized fingerprint", () => {
    const leak = {
      member: 4,
      gap: 0,
      stiffnessFraction: 0.35,
      loadCases: ["LC-1" as const],
      mustBeActive: [],
      mustBeInactive: [],
      enabled: true,
    };
    const nominal = solveTruss(15, "LC-1");
    const realized = solveRealized(15, "LC-1", [leak]);

    expect(realized.stable).toBe(true);
    expect(nominal.fingerprint[4]).toBe(0);
    expect(realized.fingerprint[4]).toBeGreaterThan(0);
  });
  it("adds repeatable normalized measurement noise", () => {
    const a = measuredFingerprint([0.2, 0.8, 0, 0, 0, 0], 0.001, mulberry32(4));
    const b = measuredFingerprint([0.2, 0.8, 0, 0, 0, 0], 0.001, mulberry32(4));
    expect(a).toEqual(b);
    expect(a.reduce((x, y) => x + y, 0)).toBeCloseTo(1);
  });
});
