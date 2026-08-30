"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import {
  SiteHeader,
  headerPrimaryButtonStyle,
} from "../shared/SiteHeader";
import {
  templatesApi,
  getTemplateMeta,
  type EmailTemplate,
} from "@/lib/api";

const containerStyle: CSSProperties = {
  maxWidth: 1100,
  margin: "40px auto",
  padding: "0 20px",
  fontFamily: "inherit",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: "0.03em",
  color: "#475569",
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  padding: "14px 12px",
  verticalAlign: "middle",
  borderBottom: "1px solid #f1f5f9",
};

const chipStyle: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  marginRight: 4,
  marginBottom: 4,
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: 11,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 4,
  color: "#0f172a",
};

const btnBase: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid transparent",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12.5,
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
  fontFamily: "inherit",
  letterSpacing: "-0.005em",
  transition: "background-color 120ms ease, border-color 120ms ease",
};

const btnSecondary: CSSProperties = {
  ...btnBase,
  background: "#ffffff",
  color: "#0f172a",
  borderColor: "#e2e8f0",
};

const btnDanger: CSSProperties = {
  ...btnBase,
  background: "#fef2f2",
  color: "#b91c1c",
  borderColor: "#fecaca",
};

const btnPrimary: CSSProperties = {
  ...btnBase,
  background: "#0f172a",
  color: "#f8fafc",
  borderColor: "#0f172a",
};

const emptyStyle: CSSProperties = {
  color: "#6b7280",
  textAlign: "center",
  marginTop: 60,
  fontSize: 14,
};

const stateMessageStyle: CSSProperties = {
  textAlign: "center",
  marginTop: 80,
  color: "#6b7280",
};

const sectionHeadingStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 12,
  margin: "0 0 16px 0",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: "-0.015em",
  color: "#0f172a",
};

const sectionSubtitleStyle: CSSProperties = {
  fontSize: 12.5,
  color: "#64748b",
};

const galleryRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 40,
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  overflow: "hidden",
  cursor: "pointer",
  textAlign: "left",
  padding: 0,
  fontFamily: "inherit",
  transition:
    "border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease",
};

const thumbFrameStyle: CSSProperties = {
  height: 260,
  background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
  overflow: "hidden",
  borderBottom: "1px solid #e2e8f0",
};

const thumbImgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover",
  objectPosition: "top",
};

const cardBodyStyle: CSSProperties = {
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const cardTitleStyle: CSSProperties = {
  fontSize: 13.5,
  fontWeight: 600,
  color: "#0f172a",
  letterSpacing: "-0.01em",
};

const cardSubjectStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const emptyGalleryStyle: CSSProperties = {
  padding: "24px 20px",
  borderRadius: 12,
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: 13,
  marginBottom: 40,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const GALLERY_PAGE_SIZE = 8;

export function TemplateListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [galleryPage, setGalleryPage] = useState(0);

  useEffect(() => {
    templatesApi
      .list()
      .then(setTemplates)
      .catch((err: Error) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const examples = useMemo(
    () => templates.filter((t) => getTemplateMeta(t).is_example),
    [templates],
  );
  // "All templates" excludes examples — those already appear in the gallery
  // above. Clones created via "Usar este template" strip the is_example flag,
  // so they land here.
  const userTemplates = useMemo(
    () => templates.filter((t) => !getTemplateMeta(t).is_example),
    [templates],
  );
  const previewTemplate = useMemo(
    () => examples.find((t) => t.id === previewId) ?? null,
    [examples, previewId],
  );

  const galleryPageCount = Math.max(1, Math.ceil(examples.length / GALLERY_PAGE_SIZE));
  // Clamp current page if examples shrink (e.g., after delete).
  const currentGalleryPage = Math.min(galleryPage, galleryPageCount - 1);
  const pagedExamples = useMemo(
    () =>
      examples.slice(
        currentGalleryPage * GALLERY_PAGE_SIZE,
        (currentGalleryPage + 1) * GALLERY_PAGE_SIZE,
      ),
    [examples, currentGalleryPage],
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await templatesApi.remove(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      window.alert(
        `Failed to delete: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await templatesApi.duplicate(id);
      setTemplates((prev) => [copy, ...prev]);
    } catch (err) {
      window.alert(
        `Failed to duplicate: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleUseExample = async (source: EmailTemplate) => {
    setCloning(true);
    try {
      const meta = getTemplateMeta(source);
      // Strip the __meta so the clone doesn't inherit is_example / thumbnail.
      const design = { ...(source.design_json as Record<string, unknown>) };
      delete (design as Record<string, unknown>).__meta;
      const created = await templatesApi.create({
        name: `${source.name} (copy)`,
        subject: source.subject,
        html_content: source.html_content,
        design_json: design,
        variables: source.variables ?? [],
      });
      // Discard unused var to keep meta reference tidy; TS/eslint don't complain
      // and the read documents intent (we deliberately drop is_example).
      void meta;
      router.push(`/templates/edit?id=${created.id}`);
    } catch (err) {
      window.alert(
        `Failed to clone: ${err instanceof Error ? err.message : String(err)}`,
      );
      setCloning(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <SiteHeader
        active="templates"
        actions={
          <Link
            href="/templates/new"
            className="email-editor-header-primary"
            style={headerPrimaryButtonStyle}
          >
            + New Template
          </Link>
        }
      />
      <div style={containerStyle}>
        {loading ? (
          <p style={stateMessageStyle}>Loading…</p>
        ) : error ? (
          <p style={{ ...stateMessageStyle, color: "#dc2626" }}>
            {error}
            <br />
            <span style={{ fontSize: 12 }}>
              Backend not running? Start it with{" "}
              <code>cd backend && npm run dev</code>.
            </span>
          </p>
        ) : (
          <>
            <div style={sectionHeadingStyle}>
              <h2 style={sectionTitleStyle}>Start from a template</h2>
              <span style={sectionSubtitleStyle}>
                {examples.length > 0
                  ? `${examples.length} example${examples.length === 1 ? "" : "s"} · click to preview`
                  : "Mark any template as an example to seed this gallery"}
              </span>
            </div>

            {examples.length === 0 ? (
              <div style={emptyGalleryStyle}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#cbd5e1",
                  }}
                />
                Open any template, tick <strong style={{ color: "#0f172a" }}>Save as example</strong>{" "}
                in the header, and it&apos;ll show up here with a thumbnail.
              </div>
            ) : (
              <>
                <div style={galleryRowStyle}>
                  {pagedExamples.map((t) => {
                    const meta = getTemplateMeta(t);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className="example-card"
                        style={cardStyle}
                        onClick={() => setPreviewId(t.id)}
                        aria-label={`Preview ${t.name}`}
                      >
                        <div style={thumbFrameStyle}>
                          {meta.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={meta.thumbnail_url}
                              alt={`${t.name} thumbnail`}
                              style={thumbImgStyle}
                              loading="lazy"
                            />
                          ) : (
                            <div
                              style={{
                                margin: "auto",
                                color: "#94a3b8",
                                fontSize: 12,
                              }}
                            >
                              No thumbnail
                            </div>
                          )}
                        </div>
                        <div style={cardBodyStyle}>
                          <span style={cardTitleStyle}>{t.name}</span>
                          <span style={cardSubjectStyle}>{t.subject}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {galleryPageCount > 1 ? (
                  <GalleryPagination
                    page={currentGalleryPage}
                    pageCount={galleryPageCount}
                    onChange={setGalleryPage}
                  />
                ) : null}
              </>
            )}

            <div style={sectionHeadingStyle}>
              <h2 style={sectionTitleStyle}>All templates</h2>
              <span style={sectionSubtitleStyle}>
                {userTemplates.length} total
              </span>
            </div>

            {userTemplates.length === 0 ? (
              <p style={emptyStyle}>
                No templates yet — pick one from the gallery above or{" "}
                <Link href="/templates/new" style={{ color: "#0f172a" }}>
                  create one from scratch
                </Link>
                .
              </p>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Subject</th>
                    <th style={thStyle}>Variables</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userTemplates.map((t) => (
                    <tr key={t.id}>
                      <td style={tdStyle}>
                        <strong>{t.name}</strong>
                      </td>
                      <td style={tdStyle}>{t.subject}</td>
                      <td style={tdStyle}>
                        {(t.variables ?? []).length === 0
                          ? "—"
                          : (t.variables ?? []).map((v) => (
                              <span key={v} style={chipStyle}>
                                {`{{${v}}}`}
                              </span>
                            ))}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <Link
                          href={`/templates/edit?id=${t.id}`}
                          style={{ ...btnSecondary, marginRight: 6 }}
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/templates/send?id=${t.id}`}
                          style={{ ...btnPrimary, marginRight: 6 }}
                        >
                          Send Test
                        </Link>
                        <button
                          type="button"
                          style={{ ...btnSecondary, marginRight: 6 }}
                          onClick={() => handleDuplicate(t.id)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          style={btnDanger}
                          onClick={() => handleDelete(t.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {previewTemplate ? (
        <PreviewModal
          template={previewTemplate}
          cloning={cloning}
          onClose={() => setPreviewId(null)}
          onUse={() => handleUseExample(previewTemplate)}
        />
      ) : null}
    </div>
  );
}

function PreviewModal({
  template,
  cloning,
  onClose,
  onUse,
}: {
  template: EmailTemplate;
  cloning: boolean;
  onClose: () => void;
  onUse: () => void;
}) {
  const meta = getTemplateMeta(template);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${template.name}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11, 18, 32, 0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "modal-fade 160ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 16,
          maxWidth: 720,
          width: "100%",
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            gap: 16,
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: 6,
              }}
            >
              Example template
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: "#0f172a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {template.name}
            </h3>
            <div
              style={{
                fontSize: 13,
                color: "#64748b",
                marginTop: 4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {template.subject}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            style={{
              flexShrink: 0,
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
            background: "#f8fafc",
            padding: 24,
            overflowY: "auto",
            textAlign: "center",
            minHeight: 0,
          }}
        >
          {meta.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.thumbnail_url}
              alt={`${template.name} preview`}
              style={{
                display: "inline-block",
                maxWidth: "100%",
                width: "auto",
                height: "auto",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 24px rgba(15, 23, 42, 0.08)",
                background: "#ffffff",
              }}
            />
          ) : (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              This example doesn&apos;t have a thumbnail yet. Open it and save
              again with the checkbox on to generate one.
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onUse}
            disabled={cloning}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              background: "#38bdf8",
              color: "#0b1220",
              border: "1px solid rgba(15,23,42,0.05)",
              borderRadius: 8,
              cursor: cloning ? "wait" : "pointer",
              opacity: cloning ? 0.7 : 1,
              boxShadow: "0 1px 0 rgba(255,255,255,0.35) inset",
            }}
          >
            {cloning ? "Clonando…" : "Usar este template"}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
 * Compact pager for the gallery. Shows Prev / [1] [2] … / Next.
 * For >7 pages, collapses the middle with an ellipsis so the bar stays short.
 */
function GalleryPagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
}) {
  const pages = buildPageList(page, pageCount);
  const buttonBase: CSSProperties = {
    minWidth: 32,
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "-0.005em",
    transition: "background-color 120ms ease, border-color 120ms ease",
  };
  const activeStyle: CSSProperties = {
    ...buttonBase,
    background: "#0f172a",
    borderColor: "#0f172a",
    color: "#f8fafc",
    cursor: "default",
  };
  const disabledStyle: CSSProperties = {
    ...buttonBase,
    color: "#cbd5e1",
    cursor: "not-allowed",
  };
  const ellipsisStyle: CSSProperties = {
    minWidth: 20,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 20,
        marginBottom: 40,
      }}
    >
      <button
        type="button"
        style={page === 0 ? disabledStyle : buttonBase}
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        ←
      </button>
      {pages.map((p, idx) =>
        p === "…" ? (
          <span key={`gap-${idx}`} style={ellipsisStyle} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            style={p === page ? activeStyle : buttonBase}
            onClick={() => onChange(p)}
            aria-label={`Page ${p + 1}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p + 1}
          </button>
        ),
      )}
      <button
        type="button"
        style={page === pageCount - 1 ? disabledStyle : buttonBase}
        disabled={page === pageCount - 1}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        →
      </button>
    </div>
  );
}

function buildPageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: Array<number | "…"> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  if (start > 1) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 2) pages.push("…");
  pages.push(total - 1);
  return pages;
}
