export type DeviceMessage = {type:"hello";fw?:string;members?:number;locks?:number}|{type:"telemetry";t?:number;seq?:number;loads:number[];locks?:number[];probe?:string}|{type:"ack";id:number;ok:boolean;error?:string}|{type:"event";code:string;member?:number;value?:number}|{type:"error";code:string;member?:number};
export type DeviceCommand = {cmd:"ping"|"tare"|"estop"}|{cmd:"calibrate";member:number;known_load:number}|{cmd:"set_topology";active:number[]}|{cmd:"probe";node:number;dir:[number,number];amp:number;dur_ms:number}|{cmd:"set_limits";max_member_load:number[]};
export type ProtocolStats={parseErrors:number;droppedLines:number;droppedSequences:number;received:number;lastSeen:number|null;latency:number|null;telemetryRate:number};
export class JsonLineParser{
 private carry=""; readonly stats:ProtocolStats={parseErrors:0,droppedLines:0,droppedSequences:0,received:0,lastSeen:null,latency:null,telemetryRate:0};
 private previousSeq:number|null=null; private timestamps:number[]=[];
 push(chunk:string):DeviceMessage[]{this.carry+=chunk;const lines=this.carry.split(/\r?\n/);this.carry=lines.pop()??"";const messages:DeviceMessage[]=[];
  for(const line of lines){if(!line.trim())continue;try{const parsed=JSON.parse(line) as DeviceMessage;if(!parsed||typeof parsed!=="object"||typeof parsed.type!=="string")throw new Error("invalid message");if(parsed.type==="telemetry"&&!Array.isArray(parsed.loads))throw new Error("invalid loads");this.stats.received++;this.stats.lastSeen=Date.now();this.timestamps.push(this.stats.lastSeen);this.timestamps=this.timestamps.filter(t=>this.stats.lastSeen!==null&&t>=this.stats.lastSeen-5000);this.stats.telemetryRate=this.timestamps.length>1?(this.timestamps.length-1)/((this.timestamps[this.timestamps.length-1]??0)-(this.timestamps[0]??0))*1000:0;if(parsed.type==="telemetry"&&typeof parsed.seq==="number"){if(this.previousSeq!==null){const delta=(parsed.seq-this.previousSeq+65536)%65536;if(delta>1&&delta<32768)this.stats.droppedSequences+=delta-1;}this.previousSeq=parsed.seq;}messages.push(parsed);}catch{this.stats.parseErrors++;this.stats.droppedLines++;}}
 return messages;}
 reset(){this.carry="";this.previousSeq=null;this.timestamps=[];this.stats.parseErrors=0;this.stats.droppedLines=0;this.stats.droppedSequences=0;this.stats.received=0;this.stats.lastSeen=null;this.stats.latency=null;this.stats.telemetryRate=0;}
}
export class CommandAcker{
 private next=1;private waiters=new Map<number,{resolve:(ok:boolean)=>void;timer:ReturnType<typeof setTimeout>;attempt:number;command:Record<string,unknown>}>();
 constructor(private readonly send:(line:string)=>void,private readonly timeoutMs=1000){}
 sendCommand(command:DeviceCommand):Promise<boolean>{return new Promise(resolve=>this.issue(command,resolve,0));}
 acknowledge(id:number,ok:boolean){const waiter=this.waiters.get(id);if(!waiter)return;clearTimeout(waiter.timer);this.waiters.delete(id);if(!ok&&waiter.attempt===0){this.issue(waiter.command as unknown as DeviceCommand,waiter.resolve,1);return;}waiter.resolve(ok);}
 private issue(command:DeviceCommand,resolve:(ok:boolean)=>void,attempt:number){const id=this.next++;const payload={...command,id};const timer=setTimeout(()=>{this.waiters.delete(id);if(attempt===0)this.issue(command,resolve,1);else resolve(false);},this.timeoutMs);this.waiters.set(id,{resolve,timer,attempt,command:payload});this.send(`${JSON.stringify(payload)}\n`);}
 dispose(){for(const waiter of this.waiters.values()){clearTimeout(waiter.timer);waiter.resolve(false);}this.waiters.clear();}
}
export type SerialPortLike={open(options:{baudRate:number}):Promise<void>;readable:ReadableStream<Uint8Array>|null;writable:WritableStream<Uint8Array>|null;close():Promise<void>};
export type SerialNavigator=Navigator&{serial?:{requestPort():Promise<SerialPortLike>;getPorts():Promise<SerialPortLike[]>}};
export function serialSupported():boolean{return typeof navigator!=="undefined"&&Boolean((navigator as SerialNavigator).serial);}
export function supportsSafetyMask(mask:number):boolean{return Number.isInteger(mask)&&mask>=0&&mask<64;}
export function frameCommand(command:DeviceCommand,id:number):string{return `${JSON.stringify({...command,id})}\n`;}
