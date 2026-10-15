import {IAssemblyDataProvider} from './assemblyDataProvider';
import {AssemblySnapshot,SimulationSpeed} from '@/types/assembly';
import {ManufacturingEngine} from '@/simulation/core/engine';
import {SimulationConfig,Snapshot} from '@/simulation/core/types';
import {demoConfig} from '@/domain/manufacturing/scenarioPresets';
import {projectSnapshot} from './assemblySnapshotProjector';
export class SimulationAssemblyProvider implements IAssemblyDataProvider {
 private engine:ManufacturingEngine;private listeners=new Set<(s:AssemblySnapshot)=>void>();private timer:ReturnType<typeof setInterval>|null=null;private speed:SimulationSpeed=60;private paused=true;
 constructor(config:SimulationConfig=demoConfig()){this.engine=new ManufacturingEngine(config);this.engine.jumpTo(Date.parse(config.startDate)+config.shiftStartHour*3600000);}
 async initialize(){if(!this.timer)this.timer=setInterval(()=>{if(!this.paused&&!this.engine.complete){this.engine.jumpTo(Math.min(this.engine.end,this.engine.time+100*this.speed));this.publish();}},100);return this.snapshot();}
 private snapshot(){const s=projectSnapshot(this.engine.snapshot(),this.engine.config);s.config={...s.config,isPaused:this.paused,speedMultiplier:this.speed};return s;}
 private publish(){const s=this.snapshot();for(const listener of this.listeners)listener(s);}
 subscribe(listener:(s:AssemblySnapshot)=>void){this.listeners.add(listener);listener(this.snapshot());return()=>{this.listeners.delete(listener);};}
 setPaused(value:boolean){this.paused=value;this.publish();}setSpeed(value:SimulationSpeed){this.speed=value;this.publish();}setDemoMode(value:boolean){this.speed=value?60:1;this.publish();}
 resetSimulation(){this.engine=this.engine.reset();this.engine.jumpTo(this.engine.start+this.engine.config.shiftStartHour*3600000);this.paused=true;this.publish();}
 stepEvent(){this.engine.stepEvent();this.publish();}stepMinute(){this.engine.stepMinute();this.publish();}jumpTo(time:number){if(time<this.engine.time)this.engine=this.engine.reset();this.engine.jumpTo(time);this.publish();}
 addRackToQueue(){}dispatchNextFromQueue(){}removeRackFromQueue(){}advanceStation(){}toggleStationBlock(){}stressTestRack(){}
 destroy(){if(this.timer)clearInterval(this.timer);this.timer=null;this.listeners.clear();}
}
export class SavedRunProvider implements IAssemblyDataProvider{
 private listeners=new Set<(s:AssemblySnapshot)=>void>();private index=0;private timer:ReturnType<typeof setInterval>|null=null;private paused=true;private speed:SimulationSpeed=1;
 constructor(private snapshots:Snapshot[],private config:SimulationConfig){if(!snapshots.length)throw new Error('Run has no snapshots');}
 async initialize(){return this.snapshot();}private snapshot(){const s=projectSnapshot(this.snapshots[this.index],this.config);s.config={...s.config,isPaused:this.paused,speedMultiplier:this.speed};return s;}
 private publish(){const s=this.snapshot();for(const listener of this.listeners)listener(s);}
 subscribe(listener:(s:AssemblySnapshot)=>void){this.listeners.add(listener);listener(this.snapshot());return()=>{this.listeners.delete(listener);};}
 seek(index:number){this.index=Math.max(0,Math.min(this.snapshots.length-1,index));this.publish();}
 stepEvent(){this.seek(this.index+1);}stepMinute(){this.seek(this.index+1);}jumpTo(time:number){let index=this.snapshots.findIndex(s=>s.time>time)-1;if(index<0)index=time>=this.snapshots[this.snapshots.length-1].time?this.snapshots.length-1:0;this.seek(index);}
 setPaused(value:boolean){this.paused=value;if(this.timer)clearInterval(this.timer);this.timer=null;if(!value)this.timer=setInterval(()=>{if(this.index>=this.snapshots.length-1)this.setPaused(true);else this.seek(this.index+1);},1000/this.speed);this.publish();}
 setSpeed(value:SimulationSpeed){this.speed=value;this.setPaused(this.paused);}setDemoMode(){}resetSimulation(){this.setPaused(true);this.seek(0);}addRackToQueue(){}dispatchNextFromQueue(){}removeRackFromQueue(){}advanceStation(){}toggleStationBlock(){}stressTestRack(){}destroy(){if(this.timer)clearInterval(this.timer);this.listeners.clear();}
}
