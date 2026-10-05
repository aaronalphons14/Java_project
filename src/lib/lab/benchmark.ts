import { enumerateMasks, matchesPattern, type Pattern } from "./patterns";
import { DEFAULT_TOPLOGY_MASK, MEMBER_DEFAULT_EA, LOAD_CASES, l1Error, solveRealized, solveTruss, type Defect, type LoadCaseId } from "./solver";
import { mulberry32, shuffle } from "./rng";
export type StrategyId="exhaustive"|"random"|"baseline"|"uncontextual"|"full";
export type TrialResult={strategy:StrategyId;tests:number;wrongPruneRate:number;missedDefectRate:number;qualified:boolean;};
export type StrategySummary={strategy:StrategyId;label:string;mean:number;median:number;p05:number;p95:number;wrongPruneRate:number;missedDefectRate:number;qualifiedRate:number;};
export type BenchmarkResult={trials:number;seed:number;simulated:true;summaries:StrategySummary[];byTrial:TrialResult[];};
const labels:Record<StrategyId,string>={exhaustive:"Exhaustive",random:"Random · no learning",baseline:"Model vs measurement",uncontextual:"Memory · no context",full:"Context patterns + verification"};
function percentile(values:number[],q:number):number {if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.round((sorted.length-1)*q)]??0;}
function runTrial(trial:number,strategy:StrategyId,rng:()=>number):TrialResult{
 const candidates=enumerateMasks().filter(mask=>mask!==0); const defects:Defect[]=[];
 const defectCount=1+(rng()<0.45?1:0);
 for(let i=0;i<defectCount;i++){let member=Math.floor(rng()*6);if(defects.some(d=>d.member===member))member=(member+1)%6;defects.push({member,gap:0.00002+rng()*0.00003,stiffnessFraction:0.15+rng()*0.55,loadCases:[LOAD_CASES[Math.floor(rng()*LOAD_CASES.length)]!.id],mustBeActive:[],mustBeInactive:[],enabled:true});}
 const order=shuffle(candidates,rng);let tests=0,wrongPrunes=0,pruned=0,missed=0,defectFound=false;const badMasks=new Set<number>();const memory:Pattern[]=[];
 for(const mask of order){if(mask===DEFAULT_TOPLOGY_MASK)continue;const loadCase=LOAD_CASES[(tests+trial)%LOAD_CASES.length]!.id;const predicted=solveTruss(mask,loadCase,MEMBER_DEFAULT_EA);const actual=solveRealized(mask,loadCase,defects,MEMBER_DEFAULT_EA);const error=l1Error(predicted.fingerprint,actual.fingerprint);const mismatch=error>0.1;
  const constrained=memory.some(pattern=>pattern.verdict==="unsafe"&&(strategy==="uncontextual"||strategy==="full"?matchesPattern(mask,pattern):pattern.mustBeActive.length===6&&matchesPattern(mask,pattern))&&(strategy==="uncontextual"||pattern.loadCase===loadCase));
  if(constrained){pruned++;if(!mismatch){wrongPrunes++;memory.forEach(pattern=>{if(pattern.verdict==="unsafe"&&matchesPattern(mask,pattern))pattern.violationCount++;});}else if(!defectFound){missed++;}continue;}
  tests++;if(mismatch){defectFound=true;badMasks.add(mask);if(strategy==="full"||strategy==="uncontextual"){memory.push({id:`${trial}-${mask}`,mustBeActive:Array.from({length:6},(_,i)=>i).filter(i=>mask&(1<<i)),mustBeInactive:Array.from({length:6},(_,i)=>i).filter(i=>!(mask&(1<<i))),loadCase,boundaryCondition:"nominal",structuralState:"ambient",responseSignature:actual.fingerprint,verdict:"unsafe",timestamp:"",source:"sim",supportCount:1,violationCount:0,verifiedCount:0,refinements:[]});}}
  if(defectFound&&(strategy==="random"||strategy==="baseline"||strategy==="uncontextual"||strategy==="full"||strategy==="exhaustive")){break;}
 }
 const totalBad=candidates.filter(mask=>mask!==DEFAULT_TOPLOGY_MASK).reduce((sum,mask)=>sum+(solveRealized(mask,"LC-1",defects).stable&&l1Error(solveTruss(mask,"LC-1").fingerprint,solveRealized(mask,"LC-1",defects).fingerprint)>0.1?1:0),0);
 return {strategy,tests,wrongPruneRate:pruned?wrongPrunes/pruned:0,missedDefectRate:totalBad?missed/totalBad:0,qualified:defectFound};
}
export function runBenchmark(trials=500,seed=202607):BenchmarkResult{
 const rng=mulberry32(seed),strategies:StrategyId[]=["exhaustive","random","baseline","uncontextual","full"],byTrial:TrialResult[]=[];
 for(let trial=0;trial<trials;trial++)for(const strategy of strategies)byTrial.push(runTrial(trial,strategy,mulberry32((seed+trial*7919+strategies.indexOf(strategy)*104729)>>>0)));
 const summaries=strategies.map(strategy=>{const rows=byTrial.filter(row=>row.strategy===strategy),tests=rows.map(row=>row.tests),mean=tests.reduce((a,b)=>a+b,0)/Math.max(1,tests.length);return {strategy,label:labels[strategy],mean,median:percentile(tests,.5),p05:percentile(tests,.05),p95:percentile(tests,.95),wrongPruneRate:rows.reduce((n,r)=>n+r.wrongPruneRate,0)/Math.max(1,rows.length),missedDefectRate:rows.reduce((n,r)=>n+r.missedDefectRate,0)/Math.max(1,rows.length),qualifiedRate:rows.filter(r=>r.qualified).length/Math.max(1,rows.length)};});
 return {trials,seed,simulated:true,summaries,byTrial};
}
export function benchmarkCsv(result:BenchmarkResult):string{return ["trial,strategy,tests,wrong_prune_rate,missed_defect_rate,qualified",...result.byTrial.map(row=>`${row.strategy},${row.strategy},${row.tests},${row.wrongPruneRate},${row.missedDefectRate},${row.qualified}`)].join("\n");}
export function benchmarkJson(result:BenchmarkResult):string{return JSON.stringify(result,null,2);}
