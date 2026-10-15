# Phase 2 — material import workflow

Implemented workbook/CSV upload, multi-sheet selection, configurable header mapping, preview, validation, explicit confirmation, immutable row provenance and source-byte retention. The UI supports versioned assumptions and approval. HMAC-signed HttpOnly sessions provide local browser access; bearer authorization remains available. Cookie mutations require a matching Origin/Host.

The supplied workbook was inspected: 14 sheets, five synthetic materials, empty actual-data and screenshot-transcription templates. The alternate SpreadsheetML namespace format is normalized only for parsing; original bytes remain unchanged. Demonstration JSON is retained separately in `data/samples/synthetic-manufacturing.json`.

Validation: 18 unit tests, 24 integration tests, lint and production build. Browser verification uploaded the original workbook, selected Materials, mapped all six source fields, validated five rows and confirmed them into the `supplied-demo` synthetic catalog. No operational balances were created. Screenshot: `/tmp/rack-import-workflow.png`.

New modules: `src/import/`, import/session/assumption API routes, `src/components/import/`, operations layout/navigation and Data Sources page. Migration 004 retains import documents and rows. Root factory adds an Operations link; existing scene remains intact.

Current import target is the material catalog. Workbook sheets for BOM, schedule, inventory and rules remain source data for subsequent scenario configuration, not automatic operational inventory writes. Numeric/date and cross-entity scenario validation must be completed with the engine configuration. Large previews display 100 rows while validating every row. Limits: 10 MiB compressed, 40 MiB expanded, 10,000 rows per sheet, 100 columns, 30 sheets. Formula cells, macros and external workbook links are rejected.
