import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Section } from "./reportModel";

/**
 * Generates an executive PDF report with headers, pagination, and tables.
 */
export async function pdfReport(sections: Section[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]); // A4 portrait
  let y = 792;

  const sanitizeText = (val: string) => val.replace(/[^\x20-\x7E\n]/g, "-");

  function drawTextLine(text: string, size: number, isHeading: boolean) {
    if (y < 55) {
      page = pdf.addPage([595, 842]);
      y = 792;
    }

    // Wrap long lines
    if (font.widthOfTextAtSize(text, size) > 505) {
      const chunks = text.match(/.{1,85}(\s|$)/g) || [text];
      for (const chunk of chunks) {
        drawTextLine(chunk.trim(), size, isHeading);
      }
      return;
    }

    page.drawText(text, {
      x: 45,
      y,
      size,
      font: isHeading ? bold : font,
      color: isHeading ? rgb(0.06, 0.2, 0.35) : rgb(0.12, 0.16, 0.22),
    });
    y -= size + 5;
  }

  function addSectionHeading(title: string) {
    if (y < 120) {
      page = pdf.addPage([595, 842]);
      y = 792;
    }
    y -= 10;
    drawTextLine(sanitizeText(title), 13, true);
    y -= 4;
  }

  for (const s of sections) {
    addSectionHeading(s.title);

    if (s.rows.length === 0) {
      drawTextLine("No records.", 9, false);
      continue;
    }

    for (const row of s.rows) {
      const formatted = row
        .map((cell, idx) => {
          const header = s.headers[idx] || "";
          const val =
            typeof cell === "number"
              ? Number.isInteger(cell)
                ? cell.toString()
                : cell.toFixed(2)
              : String(cell);
          return `${header}: ${val}`;
        })
        .join(" | ");

      drawTextLine(sanitizeText(formatted), 8.5, false);
      y -= 2;
    }

    y -= 8;
  }

  // Add footer to all pages with page numbers and disclaimer
  const totalPages = pdf.getPageCount();
  pdf.getPages().forEach((p, idx) => {
    p.drawText(`SIMULATED RESULTS — NOT ACTUAL HISTORICAL PERFORMANCE`, {
      x: 45,
      y: 25,
      size: 7.5,
      font,
      color: rgb(0.5, 0.55, 0.6),
    });
    p.drawText(`Page ${idx + 1} of ${totalPages}`, {
      x: 495,
      y: 25,
      size: 7.5,
      font,
      color: rgb(0.5, 0.55, 0.6),
    });
  });

  const pdfBytes = await pdf.save();
  return new Uint8Array(pdfBytes);
}
