"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader, headerLinkButtonStyle } from "../shared/SiteHeader";
import {
  templatesApi,
  sendEmailApi,
  type EmailTemplate,
} from "@/lib/api";

const containerStyle: CSSProperties = {
  maxWidth: 560,
  margin: "40px auto",
  padding: "0 20px",
  fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  display: "block",
  marginBottom: 4,
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 5,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "Arial",
};

const fieldStyle: CSSProperties = {
  marginBottom: 16,
};

const btnSend: CSSProperties = {
  background: "#000",
  color: "#fff",
  padding: "12px 0",
  border: 0,
  borderRadius: 4,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 15,
  width: "100%",
};

const btnBack: CSSProperties = {
  background: "none",
  border: 0,
  cursor: "pointer",
  fontSize: 13,
  color: "#374151",
  padding: 0,
  marginBottom: 12,
  textDecoration: "underline",
};

const errorStyle: CSSProperties = {
  color: "#dc2626",
  fontSize: 13,
  margin: "0 0 12px 0",
  padding: 12,
  background: "#fee2e2",
  borderRadius: 4,
};

const successStyle: CSSProperties = {
  textAlign: "center",
  marginTop: 40,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
  padding: 24,
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 4,
};

export function SendTestPage({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [subjectOverride, setSubjectOverride] = useState("");
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    templatesApi
      .get(templateId)
      .then((t) => {
        setTemplate(t);
        const initial: Record<string, string> = {};
        for (const v of t.variables ?? []) initial[v] = "";
        setVarValues(initial);
      })
      .catch((err: Error) =>
        setLoadError(err.message ?? "Failed to load template"),
      );
  }, [templateId]);

  const handleSend = async () => {
    if (!to.trim()) {
      setError("Recipient email is required");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendEmailApi.send({
        templateId,
        to,
        subject: subjectOverride || undefined,
        variables: varValues,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
      <SiteHeader
        actions={
          <Link
            href="/"
            className="email-editor-header-ghost"
            style={headerLinkButtonStyle}
          >
            ← Templates
          </Link>
        }
      />
      <div style={containerStyle}>
        <button
          type="button"
          style={btnBack}
          onClick={() => router.push("/")}
        >
          ← Back to templates
        </button>

        {loadError ? (
          <p style={errorStyle}>{loadError}</p>
        ) : !template ? (
          <p style={{ textAlign: "center", color: "#6b7280" }}>Loading…</p>
        ) : sent ? (
          <div style={successStyle}>
            <p style={{ margin: 0, fontWeight: 700 }}>
              Email sent successfully!
            </p>
            <Link
              href="/"
              style={{
                background: "#000",
                color: "#fff",
                padding: "8px 20px",
                textDecoration: "none",
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              Back to templates
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ margin: "0 0 24px 0", fontSize: 22 }}>
              Send Test — {template.name}
            </h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Recipient <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                style={inputStyle}
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Subject (optional override)</label>
              <input
                style={inputStyle}
                value={subjectOverride}
                onChange={(e) => setSubjectOverride(e.target.value)}
                placeholder={template.subject}
              />
            </div>

            {(template.variables ?? []).length > 0 && (
              <div style={{ marginTop: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, margin: "0 0 12px 0" }}>
                  Template Variables
                </h3>
                {(template.variables ?? []).map((v) => (
                  <div key={v} style={fieldStyle}>
                    <label style={labelStyle}>
                      <code
                        style={{
                          background: "#f3f4f6",
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontFamily: "Menlo, monospace",
                        }}
                      >{`{{${v}}}`}</code>
                    </label>
                    <input
                      style={inputStyle}
                      value={varValues[v] ?? ""}
                      onChange={(e) =>
                        setVarValues((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                      placeholder={`Value for ${v}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {error && <p style={errorStyle}>{error}</p>}

            <button
              type="button"
              style={btnSend}
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "Sending…" : "Send Email"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
