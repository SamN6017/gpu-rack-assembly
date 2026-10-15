import {IAssemblyDataProvider} from './assemblyDataProvider';
import {AssemblySnapshot} from '@/types/assembly';
import {ReadOnlyEventAdapter,ConnectionState} from '@/integrations/adapters';
import {EventProjection} from '@/integrations/events';
/** External data is read-only. No transport has a manufacturing command method. */
export class RealtimeAssemblyProvider implements IAssemblyDataProvider{
 private listeners=new Set<(snapshot:AssemblySnapshot)=>void>();private disconnect:(()=>void)|null=null;readonly projection=new EventProjection();connection:ConnectionState={status:'DISCONNECTED',lastReceived:null};
 constructor(private adapter?:ReadOnlyEventAdapter,private currentSnapshot?:AssemblySnapshot){}
 async initialize(){if(!this.adapter||!this.currentSnapshot)throw new Error('An authorized adapter and confirmed initial snapshot are required');this.currentSnapshot={...this.currentSnapshot,mode:'LIVE',readOnly:true};this.disconnect=this.adapter.connect(event=>{this.projection.ingest(event);},status=>{this.connection=status;});return this.currentSnapshot;}
 subscribe(listener:(snapshot:AssemblySnapshot)=>void){this.listeners.add(listener);if(this.currentSnapshot)listener(this.currentSnapshot);return()=>{this.listeners.delete(listener);};}
 addRackToQueue(){}dispatchNextFromQueue(){}removeRackFromQueue(){}advanceStation(){}toggleStationBlock(){}stressTestRack(){}setPaused(){}setSpeed(){}setDemoMode(){}resetSimulation(){}
 destroy(){this.disconnect?.();this.listeners.clear();this.connection={status:'DISCONNECTED',lastReceived:null};}
}
