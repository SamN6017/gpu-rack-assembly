# Quality Assurance & Acceptance Specification

## 1. Acceptance Overview

The GPU Rack Assembly Digital Twin represents an industrial-grade, discrete-event simulation, analytics, and operational monitoring platform. This document defines the formal acceptance gates, verification criteria, and quality standards established across all 10 implementation phases.

## 2. Core Functional Requirements Checklist

| Requirement | Implementation Module | Verification Suite | Status |
| :--- | :--- | :--- | :--- |
| **Relational Data Model & Constraints** | `prisma/schema.prisma` | `tests/integration/schemaConstraints.test.ts` | **PASSED** |
| **Material Master Data & Import Engine** | `src/domain/manufacturing/`, `src/app/api/materials/` | `tests/unit/importValidation.test.ts`, `tests/integration/importPersistence.test.ts` | **PASSED** |
| **Deterministic Discrete-Event Engine** | `src/simulation/core/engine.ts` | `tests/unit/manufacturingEngine.test.ts`, `tests/integration/simulationRunPersistence.test.ts` | **PASSED** |
| **Finite Inventory Conservation** | `src/simulation/core/engine.ts`, `src/analytics/` | `tests/integration/analyticsReconciliation.test.ts` | **PASSED** |
| **Two-Bin Kanban Replenishment** | `src/simulation/core/kanban.ts` | `tests/unit/kanban.test.ts`, `tests/integration/kanbanQueries.test.ts` | **PASSED** |
| **3D Factory Projection & Animation** | `src/three/`, `src/services/assemblySnapshotProjector.ts` | `tests/unit/playbackProjection.test.ts` | **PASSED** |
| **Operations Analytics (10 Dimensions)** | `src/server/queries/analytics.ts`, `src/components/analytics/` | `tests/integration/analyticsReconciliation.test.ts` | **PASSED** |
| **Scenario Presets & Sensitivity Analysis** | `src/domain/manufacturing/scenarioPresets.ts`, `src/server/services/scenarioService.ts` | `tests/unit/scenarioPresets.test.ts`, `tests/integration/scenarioComparison.test.ts` | **PASSED** |
| **Multi-Format Export & Report Safety** | `src/reports/` (CSV, XLSX, PDF) | `tests/unit/exportSafety.test.ts`, `tests/integration/reportExports.test.ts` | **PASSED** |
| **Evidence-Based Recommendations** | `src/reports/recommendations.ts` | `tests/unit/recommendations.test.ts` | **PASSED** |
| **Read-Only Telemetry Streaming & Replay** | `src/domain/manufacturing/manufacturingEvent.ts`, `src/services/adapters/` | `tests/unit/liveEventValidation.test.ts` | **PASSED** |
| **Deduplication & Out-of-Order Reconciliation** | `src/server/services/ingestionService.ts`, `reconciliationService.ts` | `tests/integration/liveDeduplication.test.ts`, `tests/integration/outOfOrderReconciliation.test.ts` | **PASSED** |
| **Strict Operational Mode Isolation** | Database schema & queries | `tests/integration/modeIsolation.test.ts` | **PASSED** |

## 3. Mass Conservation Laws

Throughout the entire lifecycle of simulation runs and analytics aggregations, finite inventory mass conservation is strictly maintained:

$$\text{Opening Stock} = \text{Closing Total} + \text{Consumed}$$

Where:
- $\text{Opening Stock} = \text{Warehouse}_{\text{initial}} + \text{PointOfUse}_{\text{initial}}$
- $\text{Closing Total} = \text{Warehouse}_{\text{final}} + \text{PointOfUse}_{\text{final}} + \text{InTransit}_{\text{final}}$
- No synthetic stock is materialized or lost during execution.

## 4. Execution Invariants

1. **Primacy of Operational Tables**: No simulation events or synthetic records may write to or alter `InventoryEvent` or `InventoryBalance`.
2. **Read-Only Safety**: Live factory telemetry adapters and replay providers are strictly read-only; all outbound equipment command methods throw errors.
3. **Spreadsheet Security**: All CSV and Excel report generators sanitize formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`, `%`) to prevent formula injection (CWE-1236).
4. **Reproducibility**: Simulation runs with identical input configuration, random seed, and engine version produce bit-for-bit identical results and identical SHA-256 event traces.
