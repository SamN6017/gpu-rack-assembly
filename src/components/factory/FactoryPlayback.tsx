'use client';
import {useEffect,useState} from 'react';
import {useAssemblyStore} from '@/store/assemblyStore';
import {SavedRunProvider,SimulationAssemblyProvider} from '@/services/simulationAssemblyProvider';
import {api} from '@/components/navigation/OperationsShell';
import type {RunDetail} from '@/components/operations/RunWorkspace';
export function FactoryPlayback(){const state=useAssemblyStore(),[saved,setSaved]=useState<RunDetail|null>(null),[error,setError]=useState('');useEffect(()=>{const id=new URLSearchParams(window.location.search).get('run');if(!id)return;let active=true;api<RunDetail>(`/api/simulation-runs/${id}`).then(run=>{if(!active)return;if(run.status!=='COMPLETED'||!run.summaryJson)throw new Error('Choose a completed run for playback');setSaved(run);useAssemblyStore.getState().useProvider(new SavedRunProvider(run.summaryJson.snapshots,run.inputSnapshotJson));}).catch(e=>setError(e.message));return()=>{active=false;};},[]);
  if (!state.hasEnteredFactory) return null;
  const isLive = state.mode === "LIVE";
  return (
    <div className="absolute bottom-5 left-48 right-5 z-40 rounded-xl bg-slate-950/95 border border-slate-700 p-3 text-xs text-slate-200 max-w-4xl shadow-2xl backdrop-blur-md">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded border border-slate-700 bg-slate-900">
          <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
          <strong className={isLive ? "text-emerald-300 font-bold" : "text-cyan-300 font-bold"}>
            {isLive ? "MODE 2: LIVE OPERATIONS (READ-ONLY)" : state.mode === "LEGACY_DEMO" ? "LEGACY DEMO" : saved ? "SAVED SIMULATION" : "MODE 1: SYNTHETIC SIMULATION"}
          </strong>
        </div>
        <span>{state.virtualTime ? new Date(state.virtualTime).toISOString() : "Illustrative legacy clock"}</span>
        {!isLive && (
          <>
            <button className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 font-semibold text-white" onClick={() => state.setPaused(!state.config.isPaused)}>
              {state.config.isPaused ? "Play" : "Pause"}
            </button>
            <button className="hover:text-cyan-300 transition-colors" onClick={state.stepEvent}>{saved ? "Next snapshot" : "Step event"}</button>
            {!saved && <button className="hover:text-cyan-300 transition-colors" onClick={state.stepMinute}>+1 min</button>}
            <button className="hover:text-rose-300 transition-colors" onClick={state.resetSimulation}>Reset</button>
            <select aria-label="Playback speed" className="bg-slate-800 rounded p-1 text-slate-200 border border-slate-700" value={state.config.speedMultiplier} onChange={(e) => state.setSpeed(Number(e.target.value) as 1 | 2 | 5 | 10 | 60)}>
              {[1, 2, 5, 10, 60].map((s) => (<option key={s} value={s}>{s}×</option>))}
            </select>
          </>
        )}
        <button
          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
            isLive ? "bg-cyan-950/80 border-cyan-500 text-cyan-300 hover:bg-cyan-900" : "bg-emerald-950/80 border-emerald-600 text-emerald-300 hover:bg-emerald-900"
          }`}
          onClick={() => {
            setSaved(null);
            state.setOperatingMode(isLive ? "SIMULATION" : "LIVE");
          }}
        >
          {isLive ? "Switch to Simulation Mode" : "Switch to Live Operations"}
        </button>
        <a href="/kanban" className="text-cyan-300 hover:underline flex items-center gap-1 font-semibold">
          Material Kanban ↗
        </a>
      </div>
      {saved && (
        <label className="block mt-2">
          Jump through persisted snapshots
          <input aria-label="Simulation date" className="w-full" type="range" min={Date.parse(saved.simulatedStart)} max={Date.parse(saved.simulatedEnd)} step={60000} value={state.virtualTime || Date.parse(saved.simulatedStart)} onChange={(e) => state.jumpTo(Number(e.target.value))} />
        </label>
      )}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[11px]">
        <span className="text-amber-400/90 flex items-center gap-1 font-medium">
          {isLive ? (
            <span className="text-emerald-400">🟢 Connected to shop floor adapter in read-only mode. External control disabled.</span>
          ) : (
            <span>⚠️ Synthetic demonstration twin data. Station operations consume finite synthetic materials.</span>
          )}
        </span>
        <span className="text-slate-500">{saved ? "Snapshot playback; daily and shift-end states." : "8-hour finite stock simulation."}</span>
      </div>
      {error && <p className="text-red-300 mt-1">{error}. Open Operations to sign in.</p>}
    </div>
  );
}
