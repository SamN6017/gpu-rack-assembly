# Phase 1 database and service setup

This foundation adds PostgreSQL persistence and server APIs. The existing factory continues to use its demonstration engine. Imported workbook data, real factory integrations, the new simulation engine and operations UI are later phases.

## Runtime and dependencies

Use Node 22.22.0 (`.nvmrc`) and npm. On this audit host, the nominal Homebrew node@22 executable unexpectedly reported Node 25, so verification uses a project-local Node 22 installation in ignored `.local/runtime`. It is not a tracked application dependency.

```bash
cd /Users/sambhaji_ajane/Desktop/Rack-assembly/gpu-rack-assembly
nvm install
nvm use
npm ci
cp .env.example .env
```

Edit `.env` with your local database password/URLs and a random API token of at least 32 characters. Do not overwrite an existing configured `.env`. No secrets are checked in. Prisma 6.19.3 is intentionally pinned with its matching client and built-in engine; no pg adapter is required for this version. Prisma config loads dotenv explicitly. New packages are pinned in package.json/lockfile.

## PostgreSQL choices

Compose is optional; it uses PostgreSQL 17.7 and binds only to localhost port 55432:

```bash
docker compose up -d postgres
docker compose exec postgres sh -c 'createdb -U "$POSTGRES_USER" gpu_rack_test'
npm run db:generate
npm run db:deploy
npm run db:seed
```

Create `gpu_rack_test` once, not on every start. Set TEST_DATABASE_URL to that distinct database. The migration user needs database ownership and permission to install `btree_gist`. `db:deploy` applies committed migrations; use `npm run db:migrate -- --name descriptive_change` only when authoring a new migration. Do not modify an applied migration.

The audit host's Docker daemon was stopped. An isolated native PostgreSQL 17.7 cluster was therefore created under `.local/postgres`, with its log in `.local/postgres.log`, development database `gpu_rack`, and test database `gpu_rack_test`. It does not use another project's PostgreSQL cluster. Its loopback TCP connections require the generated password; its local Unix socket uses trust for development convenience. These are local development credentials, not a production deployment configuration.

For this already-initialized native cluster:

```bash
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .local/postgres -l .local/postgres.log -o '-h 127.0.0.1 -p 55432 -k /tmp' start
# Stop it when no longer needed:
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D .local/postgres stop
```

Do not start native PostgreSQL and Compose on the same port. On this host, use the project-local runtime when nvm is unavailable:

```bash
export PATH="$PWD/.local/runtime/node_modules/.bin:$PATH"
node --version
```

The seed is repeatable: it creates five canonical stations with stable UUID primary keys, preserves `STATION-1`…`STATION-5` as codes and existing application names, and records their default definitions as assumed demonstration provenance. It does not overwrite customized stations or create any operational inventory, models, materials or demand.

## Database invariants

The first migration creates 19 entities: all 16 requested foundation entities plus DataProvenance, DataAssumption and InventoryReservation. The second adds further cross-entity and lifecycle checks; the third rejects simulation/replay sources in the operational ledger. SQL checks/exclusion constraints/triggers enforce nonnegative balances, reserved <= on-hand, material/catalog uniqueness, effective BOM interval non-overlap, unit rules, replenishment bounds, import counts, immutable ledgers/provenance, frozen run inputs, assumption approvals, hierarchy cycle rejection and separation of synthetic materials/models from operational records.

Domain services run serializable transactions with bounded retries for serialization/unique-key races. A duplicate event key with identical normalized input returns the original event; changed input conflicts. Transfers update both ends and the immutable event in one transaction. Consumption must match one active reservation exactly and can only happen once. A correction appends a signed adjustment with a reason; events are never edited. Return events credit the returned-to location. In-transit stock is represented by two explicit transfers through a transit location.

Data quantities are decimal strings, limited to six fractional digits. EA/KIT require whole quantities. Direct database accounts can bypass application transaction conventions; use restricted application and migration roles, a dedicated worker role without operational write privileges, and reviewed grants before shared or production deployment. Local development currently uses the isolated cluster owner. Synthetic scenarios and runs have their own tables/JSON and never invoke operational inventory services; the future engine integration must preserve this boundary.

## API contract

All foundation routes require `Authorization: Bearer <MANUFACTURING_API_TOKEN>`, including health and reads. Missing/short configured token returns 503; invalid credentials return 401. This local bootstrap token is not a replacement for user/role authorization before real factory integration. The token is server-only and is not embedded in the factory browser.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Database reachability |
| `/api/materials` | GET, POST | List/create material master records |
| `/api/materials/[id]` | GET, PUT | Read/full replacement; referenced identity/units protected |
| `/api/rack-models` | GET, POST | Distinct model master records |
| `/api/workstations` | GET | Five seeded stations |
| `/api/boms` | GET, POST | Effective-dated BOM rows |
| `/api/inventory` | GET | Operational balances with material/location references |

List routes accept only `limit` (1–100, default 25) and `offset` (0–100000, default 0). Requests require JSON content type and a maximum 64 KiB body. Unknown properties, missing values and invalid numeric/date/ID values are rejected. Responses use decimal strings. Conflicts return 409, missing records 404 and validation errors 400; database details/credentials are not exposed.

Example material JSON (use only in an appropriate synthetic catalog):

```json
{
  "catalogNamespace": "demonstration",
  "partNumber": "DEMO-CHASSIS",
  "description": "Synthetic demonstration chassis",
  "category": "Mechanical",
  "unitOfMeasure": "EA",
  "sourceReference": "Explicit synthetic demonstration",
  "datasetKind": "SYNTHETIC"
}
```

No endpoint posts inventory events or controls manufacturing equipment. Master data edits are authorized by the bootstrap token; operational mutations are internal services only. The existing factory has no API token and retains its mock provider. Full import/assumption UI and production users/roles are later work.

## Verification

```bash
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
npm run start -- --hostname 127.0.0.1 --port 3010
# In a second terminal, with .env present:
node scripts/verify-foundation-http.mjs
```

Integration tests refuse missing URLs, non-loopback hosts, database names without `_test`, and a test database matching the development database. They apply migrations and reset a fixed list of tables only inside the dedicated test database. Never use an operational database as TEST_DATABASE_URL.

`verify-foundation-http.mjs` is read-only, reads the token from ignored `.env` without printing it, and checks authorized reads, unauthorized rejection, pagination bounds, absence of an inventory mutation route and factory HTTP availability. Browser smoke additionally needs a rendered Canvas, camera mode selection, Kanban modal, and demo rack transfers; a passing HTTP/build check alone does not prove rendering compatibility.

## Limits

- No workbook/CSV import or manufacturing data was loaded in Phase 1.
- Scenario/run schema exists; engine-specific scenario JSON validation, simulation jobs, execution, dashboards and reporting arrive in later phases. Phase 1 exposes no scenario-create/run API.
- Replenishment and production lifecycle execution belongs to later engine phases; foundation tables/checks do not implement those workflows.
- No external factory service is connected. Existing realtime prototype code is untouched and remains unused; its command methods must be removed before live use.
- Original pause/reset/manual-fault timing limitations remain in the legacy demonstration engine.
- Raw provenance entity references are polymorphic logical references; source/import links use database FKs. Future importer must validate entity/field references.
- Local owner-role development credentials and bootstrap API token are unsuitable for shared production deployment.
