import {describe,expect,it,vi} from "vitest";
import {CommandAcker,JsonLineParser,frameCommand,supportsSafetyMask} from "./serial";
describe("newline JSON serial pipeline",()=>{
 it("buffers partial frames and parses multiple messages",()=>{const parser=new JsonLineParser();expect(parser.push('{"type":"hello"}\n{"type":"tele')).toHaveLength(1);const messages=parser.push('metry","seq":4,"loads":[1]}\n');expect(messages[0]?.type).toBe("telemetry");});
 it("counts malformed lines and dropped sequence numbers",()=>{const parser=new JsonLineParser();parser.push('nope\n{"type":"telemetry","seq":2,"loads":[]}\n{"type":"telemetry","seq":5,"loads":[]}\n');expect(parser.stats.parseErrors).toBe(1);expect(parser.stats.droppedSequences).toBe(2);});
 it("retries commands once and resolves on acknowledgement",async()=>{vi.useFakeTimers();const sent:string[]=[];const acker=new CommandAcker(line=>sent.push(line),20);const promise=acker.sendCommand({cmd:"ping"});expect(sent).toHaveLength(1);await vi.advanceTimersByTimeAsync(20);expect(sent).toHaveLength(2);const id=JSON.parse(sent[1]??"{}").id as number;acker.acknowledge(id,true);await expect(promise).resolves.toBe(true);acker.dispose();vi.useRealTimers();});
 it("frames command IDs and validates six-member masks",()=>{expect(JSON.parse(frameCommand({cmd:"tare"},3)).id).toBe(3);expect(supportsSafetyMask(63)).toBe(true);expect(supportsSafetyMask(64)).toBe(false);});
});
