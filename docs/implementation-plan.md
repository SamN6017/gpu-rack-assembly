# Manufacturing digital twin — phased implementation checklist

Status: Phase 1 was authorized by the user and implemented. See [Phase 1 completion record](phase-1-completion.md) for exact changes, verification and limitations. The user authorized completion of Phases 2–10 on 2026-10-15; those phases are now in progress. Checkboxes describe actual completion, not intent.

Architecture: [current system](architecture/current-system.md), [target system and proposed database schema](architecture/target-system.md).

## Phase 0 — audit record

- [x] Identify correct nested checkout, clean baseline, remote and base commit.
- [x] Inspect package dependencies, routes, engine, store, providers, domain types and factory/board/dashboard integration.
- [x] Attempt existing test and build commands before documentation changes.
- [x] Install locked existing dependencies and obtain a successful production build.
- [x] Document missing test infrastructure and unconfigured lint.
- [x] Create `feature/manufacturing-digital-twin`.
- [x] Create current/target architecture and phased implementation checklist.
- [x] Inspect supplied JSON manifest and representative records; distinguish synthetic fixtures and station-name conflicts.
- [x] Confirm basic 3D factory operation after delayed browser hydration: rendered scene, camera mode selection, Kanban, demo transfers/arrivals, reset and pause control.
- [ ] Complete full pointer-lock/WASD/collision/proximity regression coverage in Phase 5.
- [x] User approved Phase 1.

Created: `docs/architecture/current-system.md`, `docs/architecture/target-system.md`, `docs/implementation-plan.md`. Modified: `README.md` to link the audit. Application source, package manifests and lockfile remain unchanged. Commit Phase 0 separately; do not push or merge as part of the audit.

## Recommended Phase 1 sequence and exact file plan

Each row is a small reviewable step. Add meaningful tests alongside the services they verify. Do not start importing the supplied manufacturing examples into operational tables.

| Order | Create / modify | Intended result and verification |
| --- | --- | --- |
| 1 | Modify `package.json`, `package-lock.json`; create `.nvmrc`, `.eslintrc.json`, `vitest.config.ts`, `tests/setup.ts` | Select supported LTS Node and compatible pinned dependencies; configure lint/test/typecheck scripts. Evaluate patched Next release separately from graphics upgrades. Re-run build and browser smoke. If selected Next requires a different lint configuration, document that change before adopting it. |
| 2 | Create `compose.yaml`, `.env.example`, `docs/development/database.md`; modify `.gitignore` | Optional local PostgreSQL with named volume, healthcheck, localhost binding and environment-provided credentials. Ignore `.env` and private uploads; keep safe `.env.example`. No credentials in browser/public config. |
| 3 | Create `prisma/schema.prisma`, ORM-version-appropriate config (`prisma.config.ts` or version-specific equivalent), `prisma/migrations/<timestamp>_foundation/migration.sql` | Implement all 16 requested entities plus provenance, assumptions and reservations from target schema. Review generated SQL and add database checks/exclusion constraints/immutability protection. Config filename is finalized with the ORM version. |
| 4 | Create `src/server/db/client.ts`, `src/server/config/env.ts`, `src/domain/manufacturing/types.ts`, `src/domain/manufacturing/schemas.ts`, `src/domain/manufacturing/quantities.ts` | Server-only database client, validated environment, domain/API schemas, decimal and unit boundaries. Never import Prisma into existing browser store or pure engine. |
| 5 | Create `src/server/repositories/materialRepository.ts`, `src/server/repositories/bomRepository.ts`, `src/server/repositories/scenarioRepository.ts`, `src/server/services/inventoryService.ts`, `src/server/services/reservationService.ts`, `src/server/services/assumptionService.ts` | CRUD/master-data boundaries, effective BOM selection, immutable operational ledger, atomic/idempotent transactions, approval versioning. Simulations have no access to operational mutation services. |
| 6 | Create `prisma/seed.ts`, `src/domain/manufacturing/workstationDefaults.ts`, `data/samples/README.md` | Idempotently seed exact five existing station IDs/names and 720-second defaults. No fabricated operational balances, parts, model mappings or demand. Keep demonstration fixtures separately labeled. Do not move legacy constants until compatibility tests exist. |
| 7 | Create `src/app/api/materials/route.ts`, `src/app/api/materials/[id]/route.ts`, `src/app/api/rack-models/route.ts`, `src/app/api/workstations/route.ts`, `src/app/api/boms/route.ts`, `src/app/api/inventory/route.ts`, `src/app/api/health/route.ts`, `src/server/http/responses.ts` | Zod-validated local master-data endpoints and read-only inventory queries; bounded pagination, structured validation/conflict errors. Keep operational transaction mutations internal until authorization design is ready. No live integration. |
| 8 | Create `tests/unit/manufacturingValidation.test.ts`, `tests/integration/schemaConstraints.test.ts`, `tests/integration/inventoryTransactions.test.ts`, `tests/integration/seed.test.ts`, `tests/integration/masterDataApi.test.ts`, `tests/integration/databaseHarness.ts` | Validate FK/unique/check constraints, effective interval overlap, ledger immutability, reservation limits, rollback, two concurrent transfers competing for stock, same-key retries, payload conflicts and repeatable seed. Use a dedicated test database, never user inventory. |
| 9 | Modify `README.md`, `docs/development/database.md`, this checklist | Record exact resolved dependency versions, setup, migration/seed/test/build evidence and limitations; commit Phase 1 separately. |

No changes to `FactoryScene.tsx`, `PhysicalKanbanBoard.tsx`, cameras, legacy engine, provider behavior or UI flows are required to establish the database foundation. A separate small compatibility/security commit may precede the database commit if a framework update is needed; report the baseline and updated checks independently.

### Proposed Phase 1 scripts and execution commands

These are the intended script contracts, **not commands currently supported by the repository**. Finalize them with the selected ORM/runtime version in Phase 1.

| Script | Intended command |
| --- | --- |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` (unit suite default) |
| `test:integration` | `vitest run --config vitest.integration.config.ts` |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:deploy` | `prisma migrate deploy` |
| `db:seed` | `tsx prisma/seed.ts` |

Also create `vitest.integration.config.ts` in step 8. Use a test database guard in the harness and an explicitly separate URL. Do not provide a reset command that can target the operational database by accident.

After those files/scripts exist, the documented local flow will be:

```bash
cd /Users/sambhaji_ajane/Desktop/Rack-assembly/gpu-rack-assembly
nvm use
npm ci
cp .env.example .env
# Fill local-only credentials and DATABASE_URL; never commit .env.
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name foundation
npm run db:seed
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build
npm run dev
```

For an existing database, use reviewed migrations with `db:deploy` instead of creating a new migration. Integration setup creates/uses its own named test database. A native PostgreSQL installation is an alternative to Compose; document its URL and privileges. No database is started by Phase 0.

Phase 1 acceptance: database healthy; clean-database migration and reapplication behavior verified; seed idempotent; constraints and concurrency tests pass; existing factory smoke/build pass; no actual stock seeded; secrets absent from Git/browser bundles. A build failure must be repaired or explicitly resolved before proceeding.

## Later phases — precise module and integration plan

Paths below are planned. New modules are additions; modifications refer to existing files unless explicitly noted as files introduced in an earlier phase. Preserve source references and backward-compatible UI actions throughout.

### Phase 2 — imports and assumptions

- [ ] Create `src/import/{workbookReader,csvReader,headerNormalizer,columnMapping,unitNormalizer,validateRows,provenance}.ts`; `src/server/services/importService.ts`; `src/server/repositories/importRepository.ts`.
- [ ] Create `src/app/api/imports/route.ts`, `src/app/api/imports/[id]/route.ts`, `src/app/api/imports/[id]/confirm/route.ts`, `src/app/api/assumptions/route.ts`, `src/app/api/assumptions/[id]/approve/route.ts`.
- [ ] Create `src/app/(operations)/layout.tsx`, `src/app/(operations)/data-sources/page.tsx`, `src/components/import/ImportWizard.tsx`, `src/components/import/ColumnMapping.tsx`, `src/components/import/ImportPreview.tsx`, `src/components/data/AssumptionReview.tsx` and `src/components/navigation/OperationsNav.tsx`.
- [ ] Create `data/raw/README.md`, `data/normalized/README.md`, `data/assumptions/README.md`, `data/samples/synthetic-manufacturing.json` after validating the supplied files. Add reviewed screenshot transcription only when evidence exists; an empty template is not completed transcription.
- [ ] Add import-row migration, retained file checksums and versioned column mappings. Map WS IDs only through explicit reviewed demonstration mapping; preserve differing source names and the separate demo rack model.
- [ ] Modify `src/app/layout.tsx`/`globals.css` to allow scrolling operations pages while preserving full-screen factory behavior. Modify root page/HUD only for unobtrusive navigation.
- [ ] Add `tests/unit/importValidation.test.ts`, `tests/integration/importPersistence.test.ts`, import fixtures and `tests/e2e/importWizard.spec.ts` with Playwright setup when first used. Verify multiple sheets, CSV quoting, empty cells, duplicate namespace/parts, malformed numeric/unit/date inputs, file/expansion limits, formula policy, FK errors, repeat imports, history and confirmation transactions.

Gate: full preview/validation/confirmation path works; source bytes and row provenance retained; assumption approval is auditable; synthetic fixtures never become actual inventory. Workbook layout and JSON correspondence are inspected here, not assumed in Phase 0.

### Phase 3 — independent discrete-event engine

- [x] Create `src/simulation/core/{engine,eventQueue,eventTypes,clock,calendar,seededRandom,production,inventory,reservations,snapshots,metrics}.ts` and `src/simulation/core/types.ts`.
- [x] Create `src/server/services/simulationService.ts`, `src/server/repositories/simulationRepository.ts`, `src/server/workers/simulationWorker.ts`, `scripts/run-simulation-worker.ts`; migrations for jobs, snapshots and aggregates.
- [x] Create `src/app/api/simulation-runs/route.ts`, `src/app/api/simulation-runs/[id]/route.ts`, `src/app/api/simulation-runs/[id]/events/route.ts`, `src/app/api/simulation-runs/[id]/snapshots/route.ts` with run ownership/local-access boundaries and bounded pagination.
- [x] Create `src/services/simulationAssemblyProvider.ts`, `src/services/assemblySnapshotProjector.ts`, `src/services/providerFactory.ts`; extend `assemblyDataProvider.ts`/`types/assembly.ts` with mode, virtual time, version and capabilities.
- [x] Modify `assemblyStore.ts` for injection, subscription disposal and immutable snapshots; retain all camera/modal actions. Keep legacy `simulationEngine.ts` and mock provider during parity work; do not abruptly redirect existing UI.
- [x] Create `tests/unit/{eventQueue,calendar,production,inventoryConservation,determinism,simulationControls}.test.ts`, `tests/integration/simulationRunPersistence.test.ts`, `tests/performance/sixMonthRun.ts`.

Gate: 5 sequential stations, all requested events/controls, priorities, calendars, equipment faults, finite warehouse, material reservation and exactly-once consumption; blocked/resumed behavior; same inputs/seed/version yield identical event stream and totals; no React imports; six-month run in worker; restart-safe job/persistence; measured duration and memory with fixed scenario sizes. Record measured performance before setting a supported upper demand limit.

### Phase 4 — two-bin replenishment

- [x] Create `src/simulation/core/{kanban,replenishment,handlers,bins,coverage}.ts`; extend core event handling and metrics.
- [x] Create `src/app/(operations)/kanban/page.tsx`, `src/components/kanban/{MaterialBoard,KanbanFilters,ReplenishmentTimeline}.tsx`, `src/app/api/simulation-runs/[id]/kanban/route.ts`.
- [x] Add bin/rule configuration migrations as needed; extend run snapshots and projection with material balances, reserved/consumed stock, orders and shortages.
- [x] Create `tests/unit/{kanban,replenishment,handlerCapacity,coverage}.test.ts`, `tests/integration/kanbanQueries.test.ts`.

Gate: inventory position subtracts outstanding demand; no duplicate orders; finite warehouse/source reservations; distinct dispatch/transit/delivery balances; configurable bins/lead/safety/handlers; source shortages; station recovery; zero-demand coverage; filters by station, material, model, inventory and replenishment status; quantities match engine.

### Phase 5 — 3D material flow and playback

- [x] Create `src/three/factoryLayout.ts`, `src/three/materials/{WarehouseZone,MaterialStaging,KanbanBins,MaterialPallet,MaterialCart,DeliveryPath,MaterialConsumption}.tsx`, `src/services/eventPlayback.ts`.
- [x] Extend `FactoryScene.tsx`, `Station3D.tsx`, `Rack3D.tsx`, `PhysicalKanbanBoard.tsx` for authoritative snapshots and visual material flow. Preserve the existing floor and station geometry; annotate material representations as illustrative.
- [x] Modify `FirstPersonController.tsx`, `CameraController.tsx`, `simulationEngine.ts` imports to share extracted layout coordinates; extend collision/proximity zones and implement actual Kanban preset targeting. Keep legacy coordinate export as a compatibility re-export.
- [x] Modify `PhysicalKanbanBoard.tsx` mount geometry to meet the north wall with brackets, with dimensions reviewed in scene; keep E/click open behavior. Update collision bounds, proximity and camera focus together.
- [x] Modify timer displays in `Station3D`, `PhysicalKanbanBoard`, `StationCard`, `KanbanModal`, `StationInspectModal`, `RackDetailModal` to projected time. Extend `FactoryHUD`, `SimulationControls`, and `AddRackModal` for capabilities, playback, real priorities and canonical model IDs.
- [x] Add `tests/unit/playbackProjection.test.ts` and `tests/e2e/factoryInteractions.spec.ts`; verify walk/orbit/queue/inspect/board, jump/seek, demo movements and snapshots while animations are disabled. Never mutate inventory from animation callbacks.

Gate: complete factory regression checklist, wall board visually attached, bounded visible rack history, responsive accelerated playback and correct event-driven material animation. Only then switch the default simulation provider; legacy demo can remain selectable without mixing data.

### Phase 6 — operations dashboard and analytics

- [x] Create operations pages `inventory/page.tsx`, `production/page.tsx`, `replenishment/page.tsx`, `analytics/page.tsx` under `src/app/(operations)`; extend navigation and existing dashboard components.
- [x] Create `src/server/queries/{dashboard,inventory,production,replenishment,analytics}.ts`, `src/components/analytics/{ProductionCharts,InventoryCharts,KanbanCharts,StationCharts,CoverageChart}.tsx` and `src/components/dashboard/SimulationSummary.tsx`.
- [x] Create `src/app/api/simulation-runs/[id]/dashboard/route.ts`, `src/app/api/simulation-runs/[id]/analytics/route.ts`; extend run aggregates/migrations as required.
- [x] Add `tests/integration/analyticsReconciliation.test.ts` and `tests/e2e/operationsViews.spec.ts`.

Gate: simulated time/status, completed/WIP/waiting racks, consumption, requests, stockouts, downtime and throughput; all 10 requested charts (daily/monthly production, consumption, inventory history, replenishment frequency, stockouts, station utilization, downtime causes, warehouse trends, coverage). Run-scoped filtering and material/station detail must reconcile to raw events and finite balances. No synthetic baseline offsets remain in analytical metrics.

### Phase 7 — scenarios and comparison

- [ ] Create `src/app/(operations)/scenarios/page.tsx`, `src/components/scenarios/{ScenarioEditor,ScenarioComparison}.tsx`, `src/domain/manufacturing/scenarioPresets.ts`, `src/server/services/scenarioService.ts`.
- [ ] Create `src/app/api/scenarios/route.ts`, `src/app/api/scenarios/[id]/route.ts`, `src/app/api/scenarios/compare/route.ts`; extend persisted scenario/run schemas and input hashes.
- [ ] Add `tests/unit/scenarioPresets.test.ts`, `tests/integration/scenarioComparison.test.ts`, `tests/e2e/scenarioRuns.spec.ts`.

Gate: start/duration/model/demand/shifts/days/warehouse/point-of-use/lead/capacity/safety/handler/seed controls; actual six-calendar-month default; baseline/increased demand/delayed supply/reduced inventory/optimized Kanban/custom presets; consistent baseline input with named overrides only; completed racks, throughput, stockouts, downtime, inventory utilization, replenishments, average stock, station utilization and baseline deltas; refresh persistence and reproducibility.

### Phase 8 — reports

- [ ] Create `src/reports/{reportModel,recommendations,csvReport,excelReport,pdfReport,exportSafety}.ts`, `src/app/(operations)/reports/page.tsx`, `src/app/api/simulation-runs/[id]/reports/route.ts`, `src/components/reports/ReportDownloads.tsx`.
- [ ] Add `tests/unit/{reportTotals,exportSafety,recommendations}.test.ts`, `tests/integration/reportExports.test.ts`, `tests/e2e/reportDownload.spec.ts` and representative rendered PDF verification artifacts.

Gate: Excel/CSV/PDF share authoritative aggregates; executive, production, inventory and Kanban analysis; evidence-based recommendations; data quality/assumptions/limits; seed/version/configuration/source references; readable PDFs and typed Excel tables; monthly totals reconcile; opening/closing stock conservation; every report explicitly simulated. Export safety prevents formula injection. WIP consumption and unfinished downtime are explained.

### Phase 9 — future read-only live/replay

- [ ] Create `src/domain/manufacturing/manufacturingEvent.ts`, `src/services/adapters/{importEventAdapter,restEventAdapter,websocketEventAdapter,sseEventAdapter,mockLiveAdapter,mqttContract}.ts`, `src/services/replayAssemblyProvider.ts`.
- [ ] Extend `assemblyDataProvider.ts`, replace outbound-command methods in `realtimeAssemblyProvider.ts` with read-only capability enforcement; extend provider selection and source freshness UI.
- [ ] Create `src/server/services/{ingestionService,reconciliationService}.ts`, raw-event/cursor/audit migrations, `src/components/data/SourceStatus.tsx`; add authenticated/authorized integration boundary before real connections. Store secret references, not credentials in source configuration JSON sent to clients.
- [ ] Add `tests/unit/liveEventValidation.test.ts`, `tests/integration/{liveDeduplication,outOfOrderReconciliation,modeIsolation}.test.ts`, `tests/e2e/sourceSwitching.spec.ts`.

Gate: normalized contract, duplicate/delayed/out-of-order support, raw references, audit trail, visible connection freshness; mock source switch and replay work; simulation cannot change actual inventory; live mode never sends control commands. No external credentials required. MQTT contract exists, and actual broker integration remains a separately configured future transport.

### Phase 10 — quality and performance closure

- [ ] Complete unit, PostgreSQL integration and browser suites introduced in earlier phases; configure `.github/workflows/ci.yml` only after local commands are stable.
- [ ] Add `tests/performance/{largeEventHistory,concurrentRuns,playback}.ts`, `docs/quality/{acceptance,performance,security}.md`.
- [ ] Measure six-month runtime/memory, persisted event sizes, aggregation/pagination latency and 3D frame responsiveness; establish reproducible budgets and document supported demand/history limits.
- [ ] Test job interruption/retry, idempotent event persistence, DB transaction races, report consistency, upload limits, export safety, credential isolation and authenticated access before actual integration.
- [ ] Run full factory interaction acceptance and visual inspection; keep meaningful events/checkpoints rather than frames; document limitations and recovery commands.

Gate: all named behaviors have tests/evidence; no skipped requirement is represented as done; clean setup reproduces migrations/seed/tests/build; report and dashboard totals reconcile; every phase has a separate commit and handoff record.

## Risks and decision log

| Risk | Required treatment |
| --- | --- |
| Existing pause/fault/reset/notification bugs | Characterize before replacing engine; test intended corrected semantics and preserve user actions. |
| No current test/lint infrastructure | Establish real gates in Phase 1; never describe zero tests as passing. |
| Basic smoke is not full interaction coverage | Overview/board/demo smoke passed after initial hydration delay; pointer-lock, collision and proximity require explicit Phase 5 acceptance. |
| Node 25, old Next and graphics dependencies | Pin compatible LTS/toolchain, address reported framework advisory, review graphics changes separately. |
| Sample data synthetic and station/model names conflict | Namespace data, retain raw values, explicitly approve aliases and assumptions; no inferred real factory stock. |
| Master-plan field list lacks provenance/approval/bin/calendar records | Implement supporting schema/migrations described in target architecture rather than dropping requirements. |
| Live provider currently includes writes | Enforce read-only at interface, adapter and server boundaries before connecting anything. |
| Mutable snapshots and mixed UI/domain state | Introduce immutable projections with revision, virtual time and lifecycle cleanup. |
| Batch event/render volume | Worker computation, bounded playback, checkpoints, incremental persistence, aggregate queries and pagination. |
| Root overflow restrictions | Scoped operations layout; preserve full-screen factory canvas. |
| Runtime version drift in future dependencies | Pin only after compatibility tests; record package choices and official references. |
| Unknown source data and shifts/lead/capacity policies | Keep UNKNOWN until supplied or explicitly approved as a simulation assumption. |

## Phase handoff template

For every implemented phase, record: behavior delivered; exact created/modified paths; commands and exit results; build result; schema/migration effects; assumptions and known limits; manual verification steps; commit ID. Fix failures before the next implementation phase. Phase 0 is documentation with known baseline verification gaps, not permission to skip future acceptance checks.

Phase 1 was authorized and delivered. Continue with Phase 2 only after the user extends the implementation scope.
