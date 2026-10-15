/**
 * Export safety utilities to prevent CSV/Excel Formula Injection (CWE-1236)
 * and ensure RFC 4180 compliance.
 */

const FORMULA_PREFIXES = ["=", "+", "-", "@", "%"];

/**
 * Sanitizes a cell value to prevent spreadsheet formula injection.
 * If the value starts with dangerous characters or separators, it prefixes with an apostrophe.
 */
export function safeCell(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "";
  }

  const str = String(value);
  if (!str) return str;

  // Check if string begins with tab or carriage return
  if (str.startsWith("\t") || str.startsWith("\r")) {
    return `'${str}`;
  }

  // Check for leading formula trigger characters, even if preceded by whitespace
  const trimmed = str.trimStart();
  if (FORMULA_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return `'${str}`;
  }

  return str;
}

/**
 * Escapes a cell string for RFC 4180 CSV output.
 * Encloses the cell in double quotes and escapes existing quotes by doubling them.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  const safe = safeCell(value);
  const str = String(safe);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Formats an array of rows as RFC 4180 CSV with UTF-8 Byte Order Mark (BOM).
 */
export function formatCsv(rows: (string | number | null | undefined)[][]): string {
  const BOM = "\uFEFF";
  const body = rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
  return BOM + body;
}
