"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/*
 * Shows the compiled email HTML — the same markup that is saved and sent —
 * inside a sandboxed iframe, instead of grapesjs' preview mode, which only
 * hides the editor chrome and still shows the per-component canvas rendering.
 */

type Viewport = "desktop" | "mobile";

const VIEWPORT_WIDTH: Record<Viewport, number | "100%"> = {
  desktop: "100%",
  mobile: 375,
};

const toggleBase: CSSProperties = {
  height: 30,
  padding: "0 12px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const toggleActive: CSSProperties = {
  ...toggleBase,
  background: "#0f172a",
  border: "1px solid #0f172a",
  color: "#f8fafc",
};

export function EmailPreviewModal({
  html,
  subject,
  onClose,
}: {
  html: string;
  subject: string;
  onClose: () => void;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Email preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(11, 18, 32, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 900,
          height: "calc(100vh - 48px)",
          background: "#ffffff",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Email preview
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#0f172a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subject || "(no subject)"}
            </div>
          </div>
          <div style={{ display: "inline-flex" }}>
            {(["desktop", "mobile"] as const).map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewport(v)}
                aria-pressed={viewport === v}
                style={{
                  ...(viewport === v ? toggleActive : toggleBase),
                  borderRadius: i === 0 ? "8px 0 0 8px" : "0 8px 8px 0",
                  marginLeft: i === 0 ? 0 : -1,
                }}
              >
                {v === "desktop" ? "Desktop" : "Mobile"}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#475569",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: "#f1f5f9",
            display: "flex",
            justifyContent: "center",
            overflow: "auto",
          }}
        >
          <iframe
            title="Email preview"
            srcDoc={html}
            // Scripts off, like an email client; links open in a new tab.
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            style={{
              width: VIEWPORT_WIDTH[viewport],
              height: "100%",
              border: 0,
              background: "#ffffff",
              boxShadow: viewport === "mobile" ? "0 0 0 1px #e2e8f0" : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
