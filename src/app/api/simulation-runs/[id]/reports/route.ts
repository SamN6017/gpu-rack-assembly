import { z } from "zod";
import { getDb } from "@/server/db/client";
import { authorize, json } from "@/server/http/responses";
import { DomainError } from "@/server/services/transaction";
import { simulationConfigSchema } from "@/simulation/core/types";
import type { RunAnalytics } from "@/analytics/runAnalytics";
import { reportSections } from "@/reports/reportModel";
import { csvReport } from "@/reports/csvReport";
import { excelReport } from "@/reports/excelReport";
import { pdfReport } from "@/reports/pdfReport";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    authorize(request);
    const { id: rawId } = await context.params;
    const id = z.string().uuid().parse(rawId);

    const url = new URL(request.url);
    const format = z.enum(["csv", "xlsx", "pdf"]).parse(url.searchParams.get("format"));

    const run = await getDb().simulationRun.findUniqueOrThrow({
      where: { id },
      include: { scenario: { select: { name: true } } },
    });

    if (run.status !== "COMPLETED") {
      throw new DomainError("RUN_INCOMPLETE", "Reports require a completed run", 400);
    }

    const config = simulationConfigSchema.parse(run.inputSnapshotJson);
    const summary = run.summaryJson as unknown as { analytics: RunAnalytics };

    const sections = reportSections({
      name: run.scenario.name,
      runId: id,
      start: run.simulatedStart.toISOString(),
      end: run.simulatedEnd.toISOString(),
      engineVersion: run.engineVersion,
      inputHash: run.inputHash,
      config,
      analytics: summary.analytics,
    });

    let bytes: Uint8Array;
    let contentType: string;

    switch (format) {
      case "csv":
        bytes = new TextEncoder().encode(csvReport(sections));
        contentType = "text/csv; charset=utf-8";
        break;
      case "xlsx":
        bytes = await excelReport(sections);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "pdf":
        bytes = await pdfReport(sections);
        contentType = "application/pdf";
        break;
    }

    return new Response(bytes as BodyInit, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="simulation-${id}.${format}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) {
      return json({ error: e.code, message: e.message }, e.status);
    }
    if (e instanceof z.ZodError) {
      return json({ error: "VALIDATION", details: e.errors }, 400);
    }
    return json({ error: "REPORT_FAILED", message: (e as Error).message }, 500);
  }
}
