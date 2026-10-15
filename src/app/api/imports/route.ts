import { getDb } from "@/server/db/client";
import { handle, page } from "@/server/http/responses";
import { uploadDocument } from "@/server/services/importService";
import { DomainError } from "@/server/services/transaction";
import { MAX_UPLOAD } from "@/import/workbookReader";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handle(request, async () => {
    const { limit, offset } = page(request);
    return getDb().importBatch.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        status: true,
        rowCount: true,
        acceptedRows: true,
        rejectedRows: true,
        createdAt: true,
        approvedBy: true,
        checksum: true,
      },
    });
  });
}
export function POST(request: Request) {
  return handle(
    request,
    async () => {
      const name = request.headers.get("x-filename") || "";
      if (!/^[^/\\\u0000-\u001f]{1,200}\.(xlsx|csv)$/i.test(name))
        throw new DomainError(
          "FILENAME",
          "A valid .xlsx or .csv filename is required",
          400,
        );
      const reader = request.body?.getReader();
      if (!reader) throw new DomainError("FILE", "File required", 400);
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > MAX_UPLOAD) {
          await reader.cancel();
          throw new DomainError(
            "FILE_SIZE",
            "Maximum file size is 10 MiB",
            413,
          );
        }
        chunks.push(value);
      }
      return uploadDocument(getDb(), Buffer.concat(chunks), name);
    },
    201,
  );
}
