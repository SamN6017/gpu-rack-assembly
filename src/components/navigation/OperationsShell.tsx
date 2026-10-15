"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
const links = [
  ["/", "Factory"],
  ["/data-sources", "Data sources"],
];
export async function api<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.message ||
        data.issues?.map((i: { message: string }) => i.message).join("; ") ||
        data.error ||
        "Request failed",
    );
  return data;
}
export function OperationsShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    [ready, setReady] = useState(false),
    [checked, setChecked] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/session")
      .then(() => setReady(true))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);
  return (
    <div className="ops">
      <aside>
        <Link className="brand" href="/">
          ▦ RACK<span>Manufacturing digital twin</span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          LOCAL WORKSPACE
          <br />
          Source data and simulation kept separate
        </div>
      </aside>
      <main>
        <header>
          <span>Manufacturing operations</span>
          <span className="pill">Local PostgreSQL</span>
        </header>
        {!checked ? (
          <p>Connecting…</p>
        ) : !ready ? (
          <section className="panel login">
            <h1>Open operations</h1>
            <p>
              Enter the local API access token configured in your environment.
              This creates an eight-hour browser session.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const token = String(new FormData(form).get("token"));
                try {
                  await api("/api/session", {
                    method: "POST",
                    headers: { authorization: `Bearer ${token}` },
                  });
                  form.reset();
                  setReady(true);
                  setError("");
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            >
              <label>
                Access token
                <input
                  name="token"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button>Open workspace</button>
            </form>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
