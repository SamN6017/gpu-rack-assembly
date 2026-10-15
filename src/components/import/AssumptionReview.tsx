"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/navigation/OperationsShell";
type Assumption = {
  id: string;
  parameter: string;
  valueJson: string | number | boolean;
  unit: string;
  rationale: string;
  sourceReference: string;
  datasetKind: string;
  version: number;
  status: string;
  contentHash: string;
  approvedBy: string | null;
};
export function AssumptionReview() {
  const [rows, setRows] = useState<Assumption[]>([]),
    [error, setError] = useState(""),
    [actor, setActor] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = () =>
    api<Assumption[]>("/api/assumptions?limit=100")
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section className="panel">
      <h2>Assumptions and review</h2>
      <p>
        Changes create a new version. Approved versions remain immutable.
        Approval records the reviewer and time.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = e.currentTarget;
          const values = Object.fromEntries(new FormData(form));
          const value = String(values.valueJson);
          try {
            await api("/api/assumptions", {
              method: "POST",
              body: JSON.stringify({
                ...values,
                valueJson:
                  values.valueType === "number" ? Number(value) : value,
                valueType: undefined,
                version: Number(values.version),
              }),
            });
            form.reset();
            await refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid">
          <label>
            Parameter
            <input name="parameter" required />
          </label>
          <label>
            Value
            <input name="valueJson" required />
          </label>
          <label>
            Value type
            <select name="valueType">
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
          </label>
          <label>
            Unit
            <input name="unit" required />
          </label>
          <label>
            Version
            <input
              name="version"
              type="number"
              min="1"
              defaultValue="1"
              required
            />
          </label>
          <label>
            Dataset
            <select name="datasetKind">
              <option>SYNTHETIC</option>
              <option>ACTUAL</option>
            </select>
          </label>
          <label>
            Source reference
            <input name="sourceReference" required />
          </label>
          <label>
            Rationale
            <input name="rationale" required />
          </label>
        </div>
        <div className="actions">
          <button disabled={busy}>Propose version</button>
        </div>
      </form>
      <label style={{ maxWidth: 320, margin: "24px 0" }}>
        Reviewer name
        <input value={actor} onChange={(e) => setActor(e.target.value)} />
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Version</th>
              <th>Source / rationale</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.parameter}
                  <br />
                  <small>{r.datasetKind}</small>
                </td>
                <td>
                  {String(r.valueJson)} {r.unit}
                </td>
                <td>{r.version}</td>
                <td>
                  {r.sourceReference}
                  <br />
                  <small>{r.rationale}</small>
                </td>
                <td>
                  {r.status === "PROPOSED" ? (
                    <button
                      disabled={!actor || busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api(`/api/assumptions/${r.id}/approve`, {
                            method: "POST",
                            body: JSON.stringify({
                              hash: r.contentHash,
                              actor,
                            }),
                          });
                          await refresh();
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Approve
                    </button>
                  ) : (
                    `${r.status} · ${r.approvedBy || ""}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
