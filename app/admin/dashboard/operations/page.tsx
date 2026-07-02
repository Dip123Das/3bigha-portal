"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type OpsData = any;

export default function ProductionOperationsPage() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");

    const supabase = getSupabaseBrowser();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      setErr("Login required.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/operations/status", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();

    if (!res.ok) {
      setErr(json?.error || "Access denied.");
      setData(null);
    } else {
      setData(json);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const card = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 8px 24px rgba(15,23,42,.06)",
  } as const;

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>3Bigha Production Operations</h1>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>Hostinger VPS, deployment, monitoring and health overview.</p>
          </div>
          <button onClick={load} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 800 }}>
            Refresh
          </button>
        </div>

        {loading && !data ? <p>Loading production status...</p> : null}

        {err ? (
          <div style={{ ...card, borderColor: "#fecaca", color: "#991b1b" }}>
            <b>{err}</b>
          </div>
        ) : null}

        {data ? (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 14 }}>
              <div style={card}><b>Server</b><p>{data.server.hostname}</p><p>{data.server.uptime}</p></div>
              <div style={card}><b>Memory</b><p>{data.server.memory}</p></div>
              <div style={card}><b>Disk</b><p>{data.server.disk}</p></div>
              <div style={card}><b>Load</b><p>{data.server.load}</p></div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 14 }}>
              <div style={card}>
                <b>Services</b>
                <p>Nginx: <b>{data.services.nginx}</b></p>
                <p>Fail2Ban: <b>{data.services.fail2ban}</b></p>
              </div>

              <div style={card}>
                <b>Git / Current Version</b>
                <p>Branch: <b>{data.git.branch}</b></p>
                <p>Commit: <b>{data.git.commit}</b></p>
                <p>{data.git.message}</p>
              </div>
            </section>

            <section style={card}>
              <h2 style={{ marginTop: 0 }}>PM2 Application</h2>
              {data.pm2.map((p: any) => (
                <div key={p.name} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 8 }}>
                  <b>{p.name}</b> — {p.status}
                  <p style={{ margin: "6px 0 0" }}>CPU: {p.cpu}% | Memory: {Math.round((p.memory || 0) / 1024 / 1024)} MB | Restarts: {p.restarts}</p>
                </div>
              ))}
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))", gap: 14, marginTop: 14 }}>
              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Deployment History</h2>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{data.deployHistory.join("\n") || "No deployment history found."}</pre>
              </div>

              <div style={card}>
                <h2 style={{ marginTop: 0 }}>Health Monitor</h2>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{data.healthLog.join("\n") || "No health log found."}</pre>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
