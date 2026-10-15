"use client";

import { useState } from "react";
import type { RunDetail } from "@/components/operations/RunWorkspace";

interface ReportDownloadsProps {
  run: RunDetail;
}

export function ReportDownloads({ run }: ReportDownloadsProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const formats = [
    {
      id: "csv",
      name: "RFC 4180 CSV",
      ext: "CSV",
      description: "Structured comma-separated values with formula safety prefixes and UTF-8 BOM.",
      contentType: "text/csv",
      icon: "📊",
    },
    {
      id: "xlsx",
      name: "Microsoft Excel Workbook",
      ext: "XLSX",
      description: "Multi-tab styled workbook with frozen headers, formatted numbers, and auto-fit columns.",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      icon: "📈",
    },
    {
      id: "pdf",
      name: "Executive PDF Document",
      ext: "PDF",
      description: "Formatted printable document with executive KPI summary, material flows, and recommendations.",
      contentType: "application/pdf",
      icon: "📄",
    },
  ];

  const handleDownload = async (format: string) => {
    setDownloading(format);
    try {
      const url = `/api/simulation-runs/${run.id}/reports?format=${format}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Report export failed: ${res.statusText}`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `simulation-${run.scenario.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${run.id.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Simulation Reports & Evidence Export
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative results for Scenario:{" "}
              <strong className="text-cyan-400">{run.scenario.name}</strong> (ID: {run.id.slice(0, 8)})
            </p>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
            Engine v{run.engineVersion} · Seed {run.simulationSeed}
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Reports contain full reconciliation across production, inventory conservation, Kanban
          replenishment performance, workstation downtime causes, and evidence-based recommendations.
          Formula injection protection is enforced on all text outputs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formats.map((fmt) => (
            <div
              key={fmt.id}
              className="flex flex-col justify-between p-4 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{fmt.icon}</span>
                  <span className="text-sm font-semibold text-slate-200">{fmt.name}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {fmt.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDownload(fmt.id)}
                disabled={downloading !== null}
                className="w-full py-2 px-3 text-xs font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {downloading === fmt.id ? (
                  <span>Generating {fmt.ext}...</span>
                ) : (
                  <span>Download {fmt.ext}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
