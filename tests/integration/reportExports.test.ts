import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { saveScenario, enqueueRun } from "@/server/services/simulationService";
import { processNextRun } from "@/server/workers/simulationWorker";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";
import { GET as getReportsRoute } from "@/app/api/simulation-runs/[id]/reports/route";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";

process.env.MANUFACTURING_API_TOKEN =
  "integration-test-token-at-least-32-characters";

const authHeaders = {
  authorization: `Bearer ${process.env.MANUFACTURING_API_TOKEN}`,
};

beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());

describe("Reports & Multi-Format Export Integration", () => {
  it("exports authoritative simulation reports in CSV, Excel, and PDF formats", async () => {
    // 1. Create and complete a simulation run
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 2;
    const scenario = await saveScenario(db, config);
    const run = await enqueueRun(db, scenario.id);
    await processNextRun(db);

    const completed = await db.simulationRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(completed.status).toBe("COMPLETED");

    // 2. Test CSV Export
    const csvReq = new Request(
      `http://localhost/api/simulation-runs/${run.id}/reports?format=csv`,
      { headers: authHeaders },
    );
    const csvRes = await getReportsRoute(csvReq, {
      params: Promise.resolve({ id: run.id }),
    });

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toContain("text/csv");
    expect(csvRes.headers.get("content-disposition")).toContain(
      `simulation-${run.id}.csv`,
    );

    const csvBytes = await csvRes.arrayBuffer();
    // Verify UTF-8 Byte Order Mark (0xEF, 0xBB, 0xBF)
    const bom = new Uint8Array(csvBytes.slice(0, 3));
    expect(Array.from(bom)).toEqual([0xef, 0xbb, 0xbf]);

    const csvText = new TextDecoder().decode(csvBytes);
    expect(csvText).toContain("SIMULATED RESULTS — Executive summary");
    expect(csvText).toContain("Monthly production");
    expect(csvText).toContain("Inventory reconciliation");
    expect(csvText).toContain("Kanban analysis");
    expect(csvText).toContain("Recommendations");
    expect(csvText).toContain("Data quality and assumptions");

    // 3. Test Excel (XLSX) Export
    const xlsxReq = new Request(
      `http://localhost/api/simulation-runs/${run.id}/reports?format=xlsx`,
      { headers: authHeaders },
    );
    const xlsxRes = await getReportsRoute(xlsxReq, {
      params: Promise.resolve({ id: run.id }),
    });

    expect(xlsxRes.status).toBe(200);
    expect(xlsxRes.headers.get("content-type")).toContain("spreadsheetml.sheet");
    expect(xlsxRes.headers.get("content-disposition")).toContain(
      `simulation-${run.id}.xlsx`,
    );

    const xlsxBuffer = await xlsxRes.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsxBuffer as Parameters<typeof workbook.xlsx.load>[0]);

    expect(workbook.worksheets.length).toBeGreaterThanOrEqual(7);
    const execSheet = workbook.getWorksheet(1);
    expect(execSheet?.name).toBeDefined();

    // 4. Test PDF Export
    const pdfReq = new Request(
      `http://localhost/api/simulation-runs/${run.id}/reports?format=pdf`,
      { headers: authHeaders },
    );
    const pdfRes = await getReportsRoute(pdfReq, {
      params: Promise.resolve({ id: run.id }),
    });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get("content-type")).toBe("application/pdf");
    expect(pdfRes.headers.get("content-disposition")).toContain(
      `simulation-${run.id}.pdf`,
    );

    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });

  it("returns 400 when format parameter is missing or unsupported", async () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 2;
    const scenario = await saveScenario(db, config);
    const run = await enqueueRun(db, scenario.id);
    await processNextRun(db);

    const invalidReq = new Request(
      `http://localhost/api/simulation-runs/${run.id}/reports?format=docx`,
      { headers: authHeaders },
    );
    const res = await getReportsRoute(invalidReq, {
      params: Promise.resolve({ id: run.id }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION");
  });

  it("returns 400 when attempting to export reports from an incomplete run", async () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 2;
    const scenario = await saveScenario(db, config);
    const run = await enqueueRun(db, scenario.id); // Still QUEUED

    const req = new Request(
      `http://localhost/api/simulation-runs/${run.id}/reports?format=csv`,
      { headers: authHeaders },
    );
    const res = await getReportsRoute(req, {
      params: Promise.resolve({ id: run.id }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("RUN_INCOMPLETE");
  });
});
