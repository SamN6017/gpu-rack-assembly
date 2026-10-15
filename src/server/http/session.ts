import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
export function sessionValue(expires = Date.now() + 8 * 60 * 60 * 1000) {
  const text = String(expires);
  return `${text}.${createHmac(
    "sha256",
    process.env.MANUFACTURING_API_TOKEN || "",
  )
    .update(`session:${text}`)
    .digest("hex")}`;
}
export function validSession(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("rack_session="))
    ?.slice(13);
  if (!value) return false;
  const expires = Number(value.split(".")[0]);
  if (
    !Number.isFinite(expires) ||
    expires < Date.now() ||
    expires > Date.now() + 8 * 60 * 60 * 1000
  )
    return false;
  const expected = Buffer.from(sessionValue(expires)),
    actual = Buffer.from(value);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { const url = new URL(origin); return ["http:", "https:"].includes(url.protocol) && url.host === request.headers.get("host"); } catch { return false; }
}
