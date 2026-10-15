"use client";

import { useEffect, useState } from "react";
import type { ConnectionState } from "@/services/adapters";

interface SourceStatusProps {
  mode: "LIVE" | "REPLAY" | "SIMULATION" | "LEGACY_DEMO";
  connectionState?: ConnectionState;
  sourceSystem?: string;
  duplicateCount?: number;
  delayedCount?: number;
  onRefresh?: () => void;
}

export function SourceStatus({
  mode,
  connectionState = { status: "DISCONNECTED", lastReceived: null },
  sourceSystem = "DEMO-LINE-1",
  duplicateCount = 0,
  delayedCount = 0,
  onRefresh,
}: SourceStatusProps) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!connectionState.lastReceived) {
      setSecondsAgo(null);
      return;
    }

    const updateAgo = () => {
      const diff = Math.floor((Date.now() - connectionState.lastReceived!) / 1000);
      setSecondsAgo(Math.max(0, diff));
    };

    updateAgo();
    const interval = setInterval(updateAgo, 1000);
    return () => clearInterval(interval);
  }, [connectionState.lastReceived]);

  const statusColors = {
    CONNECTED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    CONNECTING: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    DISCONNECTED: "bg-slate-700/30 text-slate-400 border-slate-700",
    ERROR: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  };

  const statusDotColors = {
    CONNECTED: "bg-emerald-400",
    CONNECTING: "bg-amber-400 animate-pulse",
    DISCONNECTED: "bg-slate-500",
    ERROR: "bg-rose-500",
  };

  const isReadOnly = mode === "LIVE" || mode === "REPLAY";

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {/* Connection Status Badge */}
          <div
            className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[connectionState.status]}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${statusDotColors[connectionState.status]}`}
            />
            <span>{connectionState.status}</span>
          </div>

          {/* Mode Pill */}
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-slate-800 text-cyan-400 border border-slate-700">
            MODE: {mode}
          </span>

          {/* Source System */}
          <span className="text-xs text-slate-300 font-mono">
            Source: <strong className="text-slate-100">{sourceSystem}</strong>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Freshness Indicator */}
          {secondsAgo !== null && (
            <span className="text-xs text-slate-400 font-mono">
              Freshness:{" "}
              <strong className="text-slate-200">
                {secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}
              </strong>
            </span>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="py-1 px-2 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Audit & Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase">
            Out-of-Order Reconciled
          </span>
          <span className="text-slate-200 font-bold text-sm">
            {delayedCount.toLocaleString()}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase">
            Duplicates Filtered
          </span>
          <span className="text-slate-200 font-bold text-sm">
            {duplicateCount.toLocaleString()}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase">
            Protocol Security
          </span>
          <span className="text-emerald-400 font-bold text-sm">TLS / WSS</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase">
            Outbound Control
          </span>
          <span className="text-amber-400 font-bold text-sm">PROHIBITED</span>
        </div>
      </div>

      {/* Read-Only Safety Banner */}
      {isReadOnly && (
        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/50 text-[11px] text-cyan-300">
          <span>🔒</span>
          <span>
            <strong>Read-Only Safety Active:</strong> Telemetry ingestion and replay
            are strictly observation-only. Factory equipment control commands and
            database write overrides are disabled at the transport interface.
          </span>
        </div>
      )}

      {connectionState.error && (
        <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300">
          Error: {connectionState.error}
        </div>
      )}
    </div>
  );
}
