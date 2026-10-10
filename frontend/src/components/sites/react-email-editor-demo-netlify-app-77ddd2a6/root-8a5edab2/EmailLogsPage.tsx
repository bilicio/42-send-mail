"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { SiteHeader } from "../shared/SiteHeader";
import { emailLogsApi, type EmailLogPage } from "@/lib/api";

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

const PAGE_SIZES = [10, 20, 50] as const;
const SEARCH_DEBOUNCE_MS = 350;

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
  flexWrap: "wrap",
};

const searchInputStyle: CSSProperties = {
  flex: "1 1 260px",
  maxWidth: 360,
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#ffffff",
};

const selectStyle: CSSProperties = {
  padding: "7px 8px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#ffffff",
};

const pagerButtonStyle: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#ffffff",
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};

export function EmailLogsPage() {
  const [data, setData] = useState<EmailLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(PAGE_SIZES[0]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const requestId = useRef(0);

  // Wait for typing to pause before hitting the backend.
  useEffect(() => {
    const next = searchInput.trim();
    // Only a real change of the term resets to page 1 — otherwise the initial
    // debounce tick would undo a page change made right after loading.
    if (next === search) return;
    const t = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    emailLogsApi
      .list({ page, perPage, search })
      .then((result) => {
        // A newer request (next page, new search) may have finished first.
        if (id !== requestId.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: Error) => {
        if (id === requestId.current) setError(err.message ?? "Failed to load");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [page, perPage, search]);

  const logs = data?.items ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const totalItems = data?.totalItems ?? 0;
  const firstItem = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalItems);

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
      <SiteHeader active="logs" />
      <div style={containerStyle}>
        <h2 style={{ margin: "0 0 24px 0", fontSize: 22 }}>Email Logs</h2>

        <div style={toolbarStyle}>
          <input
            type="search"
            placeholder="Search by email…"
            aria-label="Search by email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={searchInputStyle}
          />
          {loading && data ? (
            <span style={{ fontSize: 12, color: "#6b7280" }}>Loading…</span>
          ) : null}
          <label
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#374151",
            }}
          >
            Rows per page
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              style={selectStyle}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && !data ? (
          <p style={stateMessageStyle}>Loading…</p>
        ) : error ? (
          <p style={{ ...stateMessageStyle, color: "#dc2626" }}>{error}</p>
        ) : logs.length === 0 ? (
          <p style={stateMessageStyle}>
            {search ? `No logs found for "${search}".` : "No logs yet."}
          </p>
        ) : (
          <>
          <table style={{ ...tableStyle, opacity: loading ? 0.6 : 1 }}>
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 16,
              fontSize: 13,
              color: "#374151",
            }}
          >
            <span>
              {firstItem}–{lastItem} of {totalItems}
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  ...pagerButtonStyle,
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  ...pagerButtonStyle,
                  opacity: page >= totalPages ? 0.5 : 1,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
