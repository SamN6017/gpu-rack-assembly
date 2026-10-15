import "server-only";
import ExcelJS from "exceljs";
import { Section } from "./reportModel";
import { safeCell } from "./exportSafety";

/**
 * Generates a styled Excel workbook (.xlsx) from report sections.
 */
export async function excelReport(sections: Section[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GPU Rack Digital Twin";
  workbook.lastModifiedBy = "GPU Rack Assembly System";
  workbook.created = new Date();
  workbook.modified = new Date();

  for (const [i, s] of sections.entries()) {
    // Sheet names max 31 chars in Excel
    const cleanTitle = s.title.replace(/^SIMULATED RESULTS — /, "").slice(0, 31);
    const ws = workbook.addWorksheet(cleanTitle);

    // Title Row
    ws.addRow([s.title]);
    const titleRow = ws.getRow(1);
    titleRow.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
    titleRow.height = 24;

    // Subtitle disclaimer
    ws.addRow(["Simulated results — not actual historical factory performance"]);
    const subRow = ws.getRow(2);
    subRow.font = { italic: true, size: 9, color: { argb: "FF64748B" } };
    ws.addRow([]); // Blank line

    // Add structured table
    ws.addTable({
      name: `SectionTable${i + 1}`,
      ref: "A4",
      headerRow: true,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true,
      },
      columns: s.headers.map((name) => ({ name })),
      rows: s.rows.length
        ? s.rows.map((row) => row.map((c) => safeCell(c)))
        : [s.headers.map((_, j) => (j === 0 ? "No records" : ""))],
    });

    // Freeze header pane below row 4
    ws.views = [{ state: "frozen", ySplit: 4 }];

    // Auto-fit column widths
    ws.columns.forEach((col, idx) => {
      if (idx === 0) {
        col.width = 30;
      } else if (s.headers.length === 2) {
        col.width = 75;
      } else {
        col.width = 22;
      }
    });

    // Formatting numbers and cell alignment
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 4) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", wrapText: true };
          if (typeof cell.value === "number") {
            cell.numFmt = Number.isInteger(cell.value) ? "#,##0" : "#,##0.00";
          }
        });
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
