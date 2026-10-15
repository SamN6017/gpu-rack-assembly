"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/navigation/OperationsShell";
import { fields, suggestMapping } from "@/import/validateRows";
import type { ValidatedRow } from "@/import/validateRows";
type Document = {
  id: string;
  checksum: string;
  sheets: {
    name: string;
    headers: string[];
    rowCount: number;
    preview: { rowNumber: number; values: string[] }[];
  }[];
};
type Batch = {
  id: string;
  filename: string;
  status: string;
  rowCount: number;
  acceptedRows: number;
  rejectedRows: number;
  createdAt: string;
  validationReportJson?: { hash: string; rows: ValidatedRow[] };
};
export function ImportWizard() {
  const [document, setDocument] = useState<Document | null>(null),
    [worksheet, setWorksheet] = useState(""),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [namespace, setNamespace] = useState(""),
    [kind, setKind] = useState("SYNTHETIC"),
    [classification, setClassification] = useState("ASSUMED"),
    [actor, setActor] = useState(""),
    [batch, setBatch] = useState<Batch | null>(null),
    [history, setHistory] = useState<Batch[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const refresh = () =>
    api<Batch[]>("/api/imports")
      .then(setHistory)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void refresh();
  }, []);
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const sheet = document?.sheets.find((s) => s.name === worksheet);
  const invalidate = () => setBatch(null);
  return (
    <>
      <section className="panel">
        <h2>Import material catalog</h2>
        <p>
          Upload → choose worksheet → map columns → review → confirm. Original
          files and row references are retained. Importing materials does not
          create inventory.
        </p>
        <label>
          Excel or CSV file
          <input
            aria-label="Upload file"
            type="file"
            accept=".xlsx,.csv"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void work(async () => {
                setBatch(null);
                setDocument(null);
                const result = await api<Document>("/api/imports", {
                  method: "POST",
                  headers: {
                    "content-type": "application/octet-stream",
                    "x-filename": file.name,
                  },
                  body: file,
                });
                setDocument(result);
                const initial =
                  result.sheets.find((s) => s.name === "Materials") ||
                  result.sheets[0];
                setWorksheet(initial.name);
                setMapping(suggestMapping(initial.headers));
              });
            }}
          />
        </label>
        {document && (
          <>
            <div className="grid" style={{ marginTop: 22 }}>
              <label>
                Worksheet
                <select
                  value={worksheet}
                  onChange={(e) => {
                    setWorksheet(e.target.value);
                    setMapping(
                      suggestMapping(
                        document.sheets.find((s) => s.name === e.target.value)!
                          .headers,
                      ),
                    );
                    invalidate();
                  }}
                >
                  {document.sheets.map((s) => (
                    <option key={s.name}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Catalog namespace
                <input
                  value={namespace}
                  placeholder="e.g. demo-2026 or plant-a"
                  onChange={(e) => {
                    setNamespace(e.target.value);
                    invalidate();
                  }}
                />
              </label>
              <label>
                Dataset
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    invalidate();
                  }}
                >
                  <option>SYNTHETIC</option>
                  <option>ACTUAL</option>
                </select>
              </label>
              <label>
                Evidence classification
                <select
                  value={classification}
                  onChange={(e) => {
                    setClassification(e.target.value);
                    invalidate();
                  }}
                >
                  {["ASSUMED", "OBSERVED", "DERIVED", "UNKNOWN"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Reviewer name
                <input
                  value={actor}
                  onChange={(e) => {
                    setActor(e.target.value);
                    invalidate();
                  }}
                />
              </label>
            </div>
            <h3 style={{ margin: "24px 0 12px" }}>
              Column mapping · {sheet?.rowCount} rows
            </h3>
            <div className="grid">
              {fields.map((f) => (
                <label key={f}>
                  {f}
                  <select
                    value={mapping[f] || ""}
                    onChange={(e) => {
                      setMapping({ ...mapping, [f]: e.target.value });
                      invalidate();
                    }}
                  >
                    <option value="">
                      {f === "datasetKind"
                        ? "Use selected dataset"
                        : "Select source column"}
                    </option>
                    {sheet?.headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="actions">
              <button
                disabled={busy || !namespace || !actor}
                onClick={() =>
                  void work(async () => {
                    const result = await api<Batch>(
                      `/api/imports/${document.id}`,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          worksheet,
                          catalogNamespace: namespace,
                          datasetKind: kind,
                          classification,
                          mapping,
                          actor,
                        }),
                      },
                    );
                    setBatch(result);
                    await refresh();
                  })
                }
              >
                Validate and preview
              </button>
              <small>10 MiB · 10,000 rows per sheet · formulas rejected</small>
            </div>
          </>
        )}
        {batch && (
          <>
            <h3 style={{ marginTop: 24 }}>
              Preview · {batch.acceptedRows} valid / {batch.rejectedRows}{" "}
              invalid
            </h3>
            <p>
              Showing the first 100 rows. Every row is validated. Correct all
              errors before confirming.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Source row</th>
                    <th>Part</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Dataset</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.validationReportJson?.rows.map((r) => (
                    <tr key={r.rowNumber}>
                      <td>{r.rowNumber}</td>
                      <td>{r.data?.partNumber || "—"}</td>
                      <td>{r.data?.description || "—"}</td>
                      <td>{r.data?.unitOfMeasure || "—"}</td>
                      <td>{r.data?.datasetKind || "—"}</td>
                      <td className={r.errors.length ? "error" : "success"}>
                        {r.errors.join("; ") || "Valid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="actions">
              <button
                disabled={busy || batch.status !== "VALIDATED"}
                onClick={() =>
                  void work(async () => {
                    await api(`/api/imports/${batch.id}/confirm`, {
                      method: "POST",
                      body: JSON.stringify({
                        hash: batch.validationReportJson?.hash,
                        actor,
                      }),
                    });
                    setMessage(
                      `Imported ${batch.acceptedRows} materials with source provenance.`,
                    );
                    setBatch(null);
                    await refresh();
                  })
                }
              >
                Confirm import
              </button>
            </div>
          </>
        )}
        {busy && <p role="status">Processing…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Import history</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Valid</th>
                <th>Rejected</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.id}>
                  <td>{b.filename}</td>
                  <td>{b.status}</td>
                  <td>{b.rowCount}</td>
                  <td>{b.acceptedRows}</td>
                  <td>{b.rejectedRows}</td>
                  <td>{new Date(b.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!history.length && <p>No import batches yet.</p>}
        </div>
      </section>
    </>
  );
}
