import { handle, json } from "@/server/http/responses";
import { sessionValue, sameOrigin } from "@/server/http/session";
export function GET(request: Request) {
  return handle(request, async () => ({ authenticated: true }));
}
export async function POST(request: Request) {
  const response = await handle(request, async () => ({ authenticated: true }));
  if (response.ok)
    response.headers.set(
      "set-cookie",
      `rack_session=${sessionValue()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
  return response;
}
export function DELETE(request: Request) {
  if (!sameOrigin(request))
    return json({ error: "ORIGIN" }, 403);
  const response = json({ authenticated: false });
  response.headers.set(
    "set-cookie",
    "rack_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
  );
  return response;
}
