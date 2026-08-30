"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { SiteHeader } from "../shared/SiteHeader";
import { emailLogsApi, type EmailLog } from "@/lib/api";

const containerStyle: CSSProperties = {
  maxWidth: 1200,
  margin: "40px auto",
  padding: "0 20px",
  fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  background: "#f3f4f6",
  borderBottom: "2px solid #e5e7eb",
  fontWeight: 700,
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
  borderBottom: "1px solid #e5e7eb",
};

const badgeSuccess: CSSProperties = {
  background: "#dcfce7",
  color: "#16a34a",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 700,
};

const badgeError: CSSProperties = {
  background: "#fee2e2",
  color: "#dc2626",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 700,
};

const stateMessageStyle: CSSProperties = {
  textAlign: "center",
  marginTop: 80,
  color: "#6b7280",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    emailLogsApi
      .list()
      .then(setLogs)
      .catch((err: Error) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
      <SiteHeader active="logs" />
      <div style={containerStyle}>
        <h2 style={{ margin: "0 0 24px 0", fontSize: 22 }}>Email Logs</h2>

        {loading ? (
          <p style={stateMessageStyle}>Loading…</p>
        ) : error ? (
          <p style={{ ...stateMessageStyle, color: "#dc2626" }}>{error}</p>
        ) : logs.length === 0 ? (
          <p style={stateMessageStyle}>No logs yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>To</th>
                <th style={thStyle}>Template</th>
                <th style={thStyle}>Subject</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={tdStyle}>{formatDate(log.created)}</td>
                  <td style={tdStyle}>{log.to}</td>
                  <td style={tdStyle}>
                    {log.template_name || log.template_id || "—"}
                  </td>
                  <td style={tdStyle}>{log.subject || "—"}</td>
                  <td style={tdStyle}>
                    <span
                      style={
                        log.status === "success" ? badgeSuccess : badgeError
                      }
                    >
                      {log.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "#dc2626", fontSize: 12 }}>
                    {log.error_message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
