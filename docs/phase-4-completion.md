# Phase 4 — Two-Bin Replenishment & Kanban Completion

## Implementation

Established two-bin point-of-use replenishment rules, net inventory position calculations, material handler scheduling, and visual Kanban management.

### New Modules & Components

| Path | Purpose |
| :--- | :--- |
| `src/simulation/core/kanban.ts` | Pure Kanban domain functions: net inventory position `(onHand + onOrder - reserved)`, `shouldReorder` trigger with single-order guard, bounded order quantities, two-bin evaluation (`FULL`, `ACTIVE`, `REPLENISHING`, `EMPTY`), working-day coverage, and handler scheduling |
| `src/app/api/simulation-runs/[id]/kanban/route.ts` | Detailed run-scoped Kanban API endpoint returning material balances, net positions, evaluated bin states, active orders, coverage, and stockout metrics |
| `src/components/kanban/MaterialBoard.tsx` | Visual point-of-use bin component with capacity progress bars, status indicators, and inventory position cards |
| `src/components/kanban/KanbanFilters.tsx` | Interactive filter bar supporting text search, workstation selection (WS1–WS5), stock status, and model display |
| `src/components/kanban/ReplenishmentTimeline.tsx` | Component displaying active orders, handler allocations (#1/#2), request/dispatch/delivery timestamps, and status badges |
| `tests/unit/kanban.test.ts` | 6 unit tests validating inventory position, single-order guard, warehouse-bounded quantities, bin statuses, coverage days, and handler assignment |
| `tests/integration/kanbanQueries.test.ts` | Integration test verifying Kanban queries against the PostgreSQL test database, checking stock conservation, bin evaluation, and replenishment events |

### Verification

- **31/31** unit tests passed (`vitest run`).
- **26/26** integration tests passed across 7 test suites against PostgreSQL (`vitest.integration.config.mts`).
- Clean TypeScript compilation (`npm run typecheck`).
- Next.js production build passed.

### Gate Checklist

- [x] Net inventory position subtracts outstanding demand (`onHand + onOrder - reserved`).
- [x] Reorder trigger prevents duplicate orders when replenishment is in flight (`onOrder > 0`).
- [x] Replenishment quantity is bounded by target capacity and available warehouse stock.
- [x] Distinct dispatch, in-transit, and delivery stages with handler queue scheduling.
- [x] Point-of-use bins evaluated across `FULL`, `ACTIVE`, `REPLENISHING`, and `EMPTY`.
- [x] Coverage in working days computed, handling zero demand gracefully.
- [x] All 5 materials from the supplied dataset mapped to stations with 2-bin rules.
- [x] Unit and integration tests verify stock conservation and event persistence.
