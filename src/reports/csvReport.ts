import { Section } from "./reportModel";
import { formatCsv } from "./exportSafety";

/**
 * Generates an RFC 4180 compliant CSV report with UTF-8 BOM.
 */
export function csvReport(sections: Section[]): string {
  const rows: (string | number)[][] = [];

  for (const s of sections) {
    rows.push([s.title]);
    rows.push(s.headers);
    for (const row of s.rows) {
      rows.push(row);
    }
    // Blank line between sections for readability
    rows.push([]);
  }

  return formatCsv(rows);
}
