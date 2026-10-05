import {describe,expect,it} from "vitest";
import {benchmarkCsv,runBenchmark} from "./benchmark";
describe("simulation benchmark",()=>{it("compares five strategies reproducibly",()=>{const a=runBenchmark(3,42),b=runBenchmark(3,42);expect(a.summaries).toHaveLength(5);expect(a.byTrial).toHaveLength(15);expect(a.summaries).toEqual(b.summaries);expect(a.simulated).toBe(true);});it("exports table rows as CSV",()=>{expect(benchmarkCsv(runBenchmark(1,7))).toContain("wrong_prune_rate");});});
