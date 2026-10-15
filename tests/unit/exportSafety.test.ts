import { describe, it, expect } from "vitest";
import {
  safeCell,
  escapeCsvCell,
  formatCsv,
} from "@/reports/exportSafety";

describe("Export Safety & Formula Injection Prevention (CWE-1236)", () => {
  it("prefixes dangerous spreadsheet formula trigger characters with an apostrophe", () => {
    expect(safeCell("=SUM(A1:B2)")).toBe("'=SUM(A1:B2)");
    expect(safeCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(safeCell("-1+1")).toBe("'-1+1");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(safeCell("\tcmd")).toBe("'\tcmd");
    expect(safeCell("\rcmd")).toBe("'\rcmd");
    expect(safeCell("%TOTAL")).toBe("'%TOTAL");
  });

  it("neutralizes formula injection even when preceded by leading whitespace", () => {
    expect(safeCell("   =1+1")).toBe("'   =1+1");
    expect(safeCell("  @HYPERLINK('http://evil.com')")).toBe(
      "'  @HYPERLINK('http://evil.com')",
    );
  });

  it("preserves safe strings and numbers without alteration", () => {
    expect(safeCell("Normal part description")).toBe("Normal part description");
    expect(safeCell("GPU-RACK-01")).toBe("GPU-RACK-01");
    expect(safeCell(42)).toBe(42);
    expect(safeCell(0)).toBe(0);
    expect(safeCell(3.1415)).toBe(3.1415);
  });

  it("safely handles non-finite numbers and null/undefined values", () => {
    expect(safeCell(NaN)).toBe("");
    expect(safeCell(Infinity)).toBe("");
    expect(safeCell(-Infinity)).toBe("");
    expect(safeCell(null)).toBe("");
    expect(safeCell(undefined)).toBe("");
  });

  it("escapes CSV cells with quotes and doubled inner quotes according to RFC 4180", () => {
    expect(escapeCsvCell("Simple")).toBe('"Simple"');
    expect(escapeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    expect(escapeCsvCell("Multi\nline")).toBe('"Multi\nline"');
    expect(escapeCsvCell("Comma, separated")).toBe('"Comma, separated"');
    expect(escapeCsvCell("=DANGEROUS()")).toBe('"\'=DANGEROUS()"');
  });

  it("formats entire CSV with UTF-8 BOM and CRLF line terminators", () => {
    const rows = [
      ["Header 1", "Header 2"],
      ["Value 1", 100],
      ["=Formula", "Safe"],
    ];

    const result = formatCsv(rows);

    expect(result.startsWith("\uFEFF")).toBe(true);
    expect(result).toContain('"Header 1","Header 2"\r\n');
    expect(result).toContain('"Value 1","100"\r\n');
    expect(result).toContain('"\'=Formula","Safe"');
  });
});
