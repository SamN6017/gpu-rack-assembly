import "dotenv/config";
import assert from "node:assert/strict";
const base = process.env.FOUNDATION_BASE_URL || "http://127.0.0.1:3010";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Verification is restricted to a local server");
const headers = {
  authorization: `Bearer ${process.env.MANUFACTURING_API_TOKEN}`,
};
for (const route of [
  "health",
  "workstations",
  "materials",
  "inventory",
  "rack-models",
  "boms",
]) {
  const response = await fetch(`${base}/api/${route}`, { headers });
  assert.equal(response.status, 200, `${route}: ${response.status}`);
  const body = await response.json();
  if (route === "workstations") assert.equal(body.length, 5);
  console.log(`GET /api/${route}: 200`);
}
assert.equal((await fetch(`${base}/api/inventory`)).status, 401);
assert.equal(
  (await fetch(`${base}/api/materials?limit=10000`, { headers })).status,
  400,
);
assert.equal(
  (await fetch(`${base}/api/inventory`, { method: "POST", headers })).status,
  405,
);
assert.equal((await fetch(`${base}/`)).status, 200);
console.log(
  "Unauthenticated requests rejected; pagination bounded; inventory mutation route absent; factory HTTP 200.",
);
