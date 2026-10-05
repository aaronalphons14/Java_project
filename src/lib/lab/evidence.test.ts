import {describe,expect,it} from "vitest";
import {CLAIM_ELEMENTS,SEED_DEPENDENT,SEED_INDEPENDENT} from "./evidence";
describe("claim evidence seeds",()=>{it("tracks the requested feature matrix",()=>expect(CLAIM_ELEMENTS.length).toBeGreaterThan(8));it("provides editable claim draft seeds",()=>{expect(SEED_INDEPENDENT).toContain("required-inactive");expect(SEED_DEPENDENT).toContain("discrimination");});});
