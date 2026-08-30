"use client";

import "grapesjs/dist/css/grapes.min.css";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import grapesjs from "grapesjs";
import type { Editor } from "grapesjs";
import mjmlPlugin from "grapesjs-mjml";
import mjml from "mjml-browser";

import {
  SiteHeader,
  headerButtonStyle,
  headerLinkButtonStyle,
  headerPrimaryButtonStyle,
  savedNoticeStyle,
} from "../shared/SiteHeader";
import {
  templatesApi,
  templateImagesApi,
  detectVariables,
  getTemplateMeta,
  mergeTemplateMeta,
  type EmailTemplate,
} from "@/lib/api";
import { captureHtmlThumbnail } from "@/lib/thumbnail";

/*
 * Layout math for grapesjs: 60px header + 45px meta bar + 45px variables bar
 * = 150px reserved above the editor canvas.
 */
const HEADER_HEIGHT = 60;
const META_BAR_HEIGHT = 45;
const VARS_BAR_HEIGHT = 45;
const RESERVED = HEADER_HEIGHT + META_BAR_HEIGHT + VARS_BAR_HEIGHT;
const EDITOR_HEIGHT_CSS = `calc(100vh - ${RESERVED}px)`;

const STARTER_MJML = `<mjml>
  <mj-body background-color="#f9f9f9">
    <mj-section background-color="#61dafb" padding="24px">
      <mj-column>
        <mj-text align="center" font-size="22px" font-weight="700" color="#000000">
          Hello {{firstName}},
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="32px 24px">
      <mj-column>
        <mj-text font-size="16px" line-height="1.6" color="#262626">
          Welcome to the demo. Add your own {{variables}} using the bar above.
        </mj-text>
        <mj-button background-color="#000000" color="#ffffff" font-weight="700" href="https://example.com">
          Get started
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

const outerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  overflow: "hidden",
  backgroundColor: "#f9f9f9",
};

const metaBarStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  padding: "0 16px",
  background: "#ffffff",
  borderBottom: "1px solid #e2e8f0",
  alignItems: "center",
  fontSize: 13,
  flexShrink: 0,
  minHeight: META_BAR_HEIGHT,
  boxSizing: "border-box",
};

const metaInputStyle: CSSProperties = {
  padding: "7px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 13,
  minWidth: 0,
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  transition: "border-color 120ms ease, box-shadow 120ms ease",
  fontFamily: "inherit",
  letterSpacing: "-0.005em",
};

const eyebrowBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 22,
  padding: "0 8px",
  background: "#f1f5f9",
  color: "#475569",
  borderRadius: 999,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  border: "1px solid #e2e8f0",
};

const eyebrowBadgeActiveStyle: CSSProperties = {
  ...eyebrowBadgeStyle,
  background: "rgba(56, 189, 248, 0.1)",
  color: "#0369a1",
  borderColor: "rgba(56, 189, 248, 0.3)",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#94a3b8",
  whiteSpace: "nowrap",
  paddingRight: 4,
};

const variablesBarStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "0 16px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  overflowX: "auto",
  fontSize: 12,
  alignItems: "center",
  minHeight: VARS_BAR_HEIGHT,
  boxSizing: "border-box",
  flexShrink: 0,
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  padding: "3px 4px 3px 4px",
  borderRadius: 6,
  whiteSpace: "nowrap",
  fontSize: 11.5,
  boxShadow: "0 1px 0 rgba(15,23,42,0.02)",
};

const chipButtonStyle: CSSProperties = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "#0f172a",
  padding: "2px 6px",
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: 11.5,
  fontWeight: 500,
  borderRadius: 4,
  letterSpacing: "-0.01em",
};

const chipRemoveStyle: CSSProperties = {
  background: "transparent",
  border: 0,
  cursor: "pointer",
  color: "#94a3b8",
  padding: "0 6px",
  fontSize: 14,
  lineHeight: 1,
  borderRadius: 4,
  height: 20,
};

const varInputStyle: CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  width: 160,
  background: "#ffffff",
  outline: "none",
  transition: "border-color 120ms ease, box-shadow 120ms ease",
};

const editorShellStyle: CSSProperties = {
  height: EDITOR_HEIGHT_CSS,
  minHeight: 0,
  position: "relative",
};

interface EmailEditorPageProps {
  templateId?: string;
}

/*
 * design_json can be one of two shapes:
 *   - grapesjs projectData: has `pages` array (saved by us)
 *   - Unlayer JSON: has `body`, `counters`, `schemaVersion` (legacy from
 *     42-send-mail templates authored in Unlayer's editor)
 * grapesjs can't natively load Unlayer's tree. When we detect the legacy shape,
 * we fall back to setting the rendered HTML as raw components so the user at
 * least sees the current email; the next save overwrites with grapesjs format.
 */
function isGrapesProjectData(design: Record<string, unknown>): boolean {
  return Array.isArray((design as { pages?: unknown[] }).pages);
}

/*
 * The stock grapesjs link action opens a tiny inline URL input that is easy to
 * miss, and window.prompt is jarring. Replace it with an inline dark panel
 * that sits directly beneath the RTE toolbar and matches its look:
 *   [ https://…             ]  Save  Cancel
 *
 * Selection has to be re-applied when the input takes focus, because clicking
 * outside the canvas iframe drops the anchor's caret inside the editor doc.
 */
function installLinkAction(editor: Editor): void {
  const rte = editor.RichTextEditor as unknown as {
    remove: (name: string) => void;
    add: (name: string, config: Record<string, unknown>) => void;
  };
  try {
    rte.remove("link");
  } catch {
    /* action might not exist yet on some builds */
  }
  rte.add("link", {
    name: "link",
    icon: '<span style="font-size:14px;font-weight:700">🔗</span>',
    attributes: { title: "Insert link" },
    state: (_rte: unknown, doc: Document): number => {
      const sel = doc.getSelection();
      if (!sel || sel.rangeCount === 0) return 0;
      const node = sel.anchorNode as Node | null;
      const anchor = node?.parentElement?.closest("a");
      return anchor ? 1 : 0;
    },
    result: (rteInstance: {
      selection: () => Selection | null;
      exec: (cmd: string, value?: string) => void;
    }) => {
      openLinkPanel(rteInstance);
    },
  });
}

interface RteBridge {
  selection: () => Selection | null;
  exec: (cmd: string, value?: string) => void;
}

function openLinkPanel(rte: RteBridge): void {
  // Close any previously open panel so we never stack them.
  const existing = document.getElementById("gjs-link-panel");
  existing?.remove();

  const sel = rte.selection();
  if (!sel) return;
  const iframeDoc = sel.anchorNode?.ownerDocument ?? null;
  if (!iframeDoc) return;

  // Snapshot selection so we can restore after the input steals focus.
  const savedRange = sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
  const savedHadSelection = !!savedRange && !savedRange.collapsed;
  const anchor =
    (sel.anchorNode as Node | null)?.parentElement?.closest("a") ?? null;
  const currentHref = anchor?.getAttribute("href") ?? "https://";

  // Slot the panel INSIDE the RTE floating toolbar, above the B/I/U/S/🔗/Text
  // row. Falls back to positioned float if the toolbar isn't in the DOM yet.
  const toolbar = document.querySelector<HTMLElement>(".gjs-rte-toolbar");

  const panel = document.createElement("div");
  panel.id = "gjs-link-panel";
  panel.setAttribute("role", "dialog");
  panel.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:6px",
    "padding:6px",
    "margin:0 0 4px 0",
    "background:transparent",
    "border-bottom:1px solid #374151",
    "font-family:Arial,\"Helvetica Neue\",Helvetica,sans-serif",
    "font-size:12px",
    "color:#f9fafb",
    "box-sizing:border-box",
  ].join(";");

  const label = document.createElement("span");
  label.textContent = anchor ? "Edit" : "Link";
  label.style.cssText =
    "color:#9ca3af;font-weight:700;letter-spacing:0.03em;padding:0 4px;white-space:nowrap";

  const input = document.createElement("input");
  input.type = "url";
  input.value = currentHref;
  input.placeholder = "https://";
  input.style.cssText = [
    "background:#1f2937",
    "color:#f9fafb",
    "border:1px solid #374151",
    "border-radius:4px",
    "padding:5px 8px",
    "font-size:12px",
    "outline:none",
    "font-family:Menlo,monospace",
    "min-width:220px",
    "flex:1",
    "box-sizing:border-box",
  ].join(";");

  const btn = (text: string, bg: string, color: string): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.style.cssText = [
      "border:0",
      `background:${bg}`,
      `color:${color}`,
      "font-weight:700",
      "font-size:12px",
      "padding:7px 12px",
      "border-radius:4px",
      "cursor:pointer",
      "font-family:Arial",
    ].join(";");
    return b;
  };

  const saveBtn = btn("Save", "#22c55e", "#052e12");
  const unlinkBtn = anchor ? btn("×", "#f87171", "#450a0a") : null;
  if (unlinkBtn) {
    unlinkBtn.setAttribute("title", "Remove link");
    unlinkBtn.setAttribute("aria-label", "Remove link");
    unlinkBtn.style.padding = "4px 10px";
    unlinkBtn.style.fontSize = "16px";
    unlinkBtn.style.lineHeight = "1";
  }

  panel.append(label, input, saveBtn);
  if (unlinkBtn) panel.append(unlinkBtn);

  if (toolbar) {
    toolbar.prepend(panel);
  } else {
    panel.style.position = "fixed";
    panel.style.top = "100px";
    panel.style.left = "100px";
    panel.style.background = "#111";
    panel.style.borderRadius = "6px";
    panel.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
    panel.style.zIndex = "10000";
    document.body.append(panel);
  }
  input.focus();
  input.select();

  const restoreSelection = () => {
    if (!savedRange) return;
    const iframeWin = iframeDoc.defaultView;
    const iframeSel = iframeWin?.getSelection();
    if (!iframeSel) return;
    iframeSel.removeAllRanges();
    iframeSel.addRange(savedRange);
  };

  const cleanup = () => {
    document.removeEventListener("mousedown", onDocClick, true);
    document.removeEventListener("keydown", onKey, true);
    panel.remove();
  };

  const applyUrl = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      cleanup();
      return;
    }
    restoreSelection();
    if (anchor) {
      anchor.setAttribute("href", trimmed);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noreferrer");
    } else if (savedHadSelection) {
      rte.exec("createLink", trimmed);
    } else {
      const html = `<a href="${trimmed}" target="_blank" rel="noreferrer">${trimmed}</a>`;
      try {
        rte.exec("insertHTML", html);
      } catch {
        /* fall back: insert at caret via range */
        if (savedRange) {
          const anchorEl = iframeDoc.createElement("a");
          anchorEl.href = trimmed;
          anchorEl.target = "_blank";
          anchorEl.rel = "noreferrer";
          anchorEl.textContent = trimmed;
          savedRange.insertNode(anchorEl);
        }
      }
    }
    const post = rte.selection();
    const postAnchor = (post?.anchorNode as Node | null)?.parentElement?.closest(
      "a",
    );
    if (postAnchor && postAnchor.getAttribute("href") === trimmed) {
      postAnchor.setAttribute("target", "_blank");
      postAnchor.setAttribute("rel", "noreferrer");
    }
    cleanup();
  };

  const removeLink = () => {
    restoreSelection();
    if (anchor) {
      const parent = anchor.parentNode;
      while (anchor.firstChild) parent?.insertBefore(anchor.firstChild, anchor);
      parent?.removeChild(anchor);
    }
    cleanup();
  };

  saveBtn.addEventListener("click", () => applyUrl(input.value));
  unlinkBtn?.addEventListener("click", removeLink);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyUrl(input.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
    }
  });

  const onDocClick = (e: MouseEvent) => {
    if (!panel.contains(e.target as Node)) cleanup();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") cleanup();
  };
  // Defer so the click that opened the panel doesn't immediately close it.
  setTimeout(() => {
    document.addEventListener("mousedown", onDocClick, true);
    document.addEventListener("keydown", onKey, true);
  }, 0);
}

function hydrateEditor(editor: Editor, tpl: EmailTemplate): void {
  try {
    const design = tpl.design_json as Record<string, unknown> | null;
    if (
      design &&
      Object.keys(design).length > 0 &&
      isGrapesProjectData(design)
    ) {
      editor.loadProjectData(
        design as Parameters<Editor["loadProjectData"]>[0],
      );
      return;
    }
    if (tpl.html_content?.trim()) {
      // Wrap in mj-body so grapesjs-mjml has something valid to parse; if the
      // stored html is already MJML-based this is a no-op via the parser.
      editor.setComponents(tpl.html_content);
    }
  } catch (err) {
    console.warn("Failed to load stored design", err);
  }
}

export function EmailEditorPage({ templateId }: EmailEditorPageProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [newVarInput, setNewVarInput] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveAsExample, setSaveAsExample] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      fromElement: false,
      height: EDITOR_HEIGHT_CSS,
      width: "auto",
      storageManager: false,
      plugins: [
        (ed: Editor) =>
          mjmlPlugin(ed, {
            resetBlocks: true,
            resetStyleManager: true,
          }),
      ],
      components: STARTER_MJML,
    });

    editorRef.current = editor;
    installLinkAction(editor);

    if (templateId) {
      templatesApi
        .get(templateId)
        .then((tpl) => {
          setName(tpl.name);
          setSubject(tpl.subject);
          setVariables(tpl.variables ?? []);
          setSaveAsExample(getTemplateMeta(tpl).is_example);
          hydrateEditor(editor, tpl);
        })
        .catch((err: Error) =>
          setLoadError(err.message ?? "Failed to load template"),
        );
    }

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [templateId]);

  const insertMergeTag = useCallback((path: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const token = `{{${path}}}`;
    const selected = editor.getSelected();
    if (selected && typeof selected.append === "function") {
      try {
        selected.append(token);
        return;
      } catch {
        /* fall through */
      }
    }
    const wrapper = editor.getWrapper();
    if (wrapper && typeof wrapper.append === "function") {
      wrapper.append(
        `<mj-section><mj-column><mj-text>${token}</mj-text></mj-column></mj-section>`,
      );
    }
  }, []);

  const addVariable = (raw: string) => {
    const cleaned = raw.trim().replace(/[^\w]/g, "");
    if (!cleaned) return;
    setVariables((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setNewVarInput("");
  };

  const removeVariable = (name: string) => {
    setVariables((prev) => prev.filter((v) => v !== name));
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    addVariable(newVarInput);
  };

  const collectMjmlAndVariables = () => {
    const editor = editorRef.current;
    if (!editor) throw new Error("Editor not ready");
    const mjmlSource = editor.getHtml() ?? "";
    if (!mjmlSource.trim()) throw new Error("Editor is empty");
    // Detect variables in the HTML output too. Combine with manual list.
    const detected = detectVariables(mjmlSource);
    const merged = Array.from(new Set([...variables, ...detected]));
    return { mjmlSource, merged };
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    if (!name.trim()) {
      window.alert("Name is required");
      return;
    }
    if (!subject.trim()) {
      window.alert("Subject is required");
      return;
    }
    setSaving(true);
    try {
      const { mjmlSource, merged } = collectMjmlAndVariables();
      let html = mjmlSource;
      try {
        const compiled = mjml(mjmlSource, {
          validationLevel: "soft",
          keepComments: false,
        });
        html = compiled.html || mjmlSource;
      } catch {
        /* keep raw mjml as fallback so save still succeeds */
      }
      let designJson = editorRef.current.getProjectData() as Record<
        string,
        unknown
      >;

      // Example-template metadata + thumbnail. If the box is checked we
      // capture a PNG from the compiled HTML and upload it via the existing
      // /template-images route so the file lives in PocketBase, not in the
      // JSON blob. Failure to capture/upload is non-fatal — we still save
      // the template, just without a thumbnail.
      if (saveAsExample) {
        let thumbnailUrl: string | null = null;
        try {
          const blob = await captureHtmlThumbnail(html);
          const uploaded = await templateImagesApi.upload(
            blob,
            `thumb-${(name || "template").replace(/\W+/g, "-").toLowerCase()}-${Date.now()}.png`,
          );
          thumbnailUrl = uploaded.url;
        } catch (err) {
          console.warn("Thumbnail capture failed", err);
        }
        designJson = mergeTemplateMeta(designJson, {
          is_example: true,
          ...(thumbnailUrl !== null ? { thumbnail_url: thumbnailUrl } : {}),
        });
      } else {
        designJson = mergeTemplateMeta(designJson, {
          is_example: false,
        });
      }

      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        html_content: html,
        design_json: designJson,
        variables: merged,
      };
      const saved: EmailTemplate = templateId
        ? await templatesApi.update(templateId, payload)
        : await templatesApi.create(payload);
      setSavedAt(Date.now());
      setVariables(saved.variables ?? merged);
      if (!templateId && saved.id) {
        router.replace(`/templates/edit?id=${saved.id}`);
      }
    } catch (err) {
      window.alert(
        `Failed to save: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const mjmlSource = editor.getHtml() ?? "";
    if (!mjmlSource.trim()) {
      window.alert("Nothing to export yet.");
      return;
    }
    try {
      const { html } = mjml(mjmlSource, {
        validationLevel: "soft",
        keepComments: false,
      });
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name || "email"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (err) {
      window.alert(
        `MJML compile failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handlePreview = () => {
    editorRef.current?.runCommand("preview");
  };

  const isNew = !templateId;
  const headerActions = (
    <>
      {savedAt !== null && (
        <span style={savedNoticeStyle}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "#4ade80",
              boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.18)",
            }}
          />
          Saved · {new Date(savedAt).toLocaleTimeString()}
        </span>
      )}
      <Link
        href="/"
        className="email-editor-header-ghost"
        style={headerLinkButtonStyle}
      >
        ← Back
      </Link>
      <button
        type="button"
        className="email-editor-header-ghost"
        style={headerButtonStyle}
        onClick={handlePreview}
      >
        Preview
      </button>
      <button
        type="button"
        className="email-editor-header-ghost"
        style={headerButtonStyle}
        onClick={handleExport}
      >
        Export HTML
      </button>
      {templateId ? (
        <Link
          href={`/templates/send?id=${templateId}`}
          className="email-editor-header-ghost"
          style={headerLinkButtonStyle}
        >
          Send Test
        </Link>
      ) : null}
      <label
        className="email-editor-example-toggle"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 34,
          padding: "0 12px",
          borderRadius: 8,
          fontSize: 12.5,
          color: saveAsExample ? "#0b1220" : "#cbd5e1",
          background: saveAsExample
            ? "rgba(56, 189, 248, 0.18)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${
            saveAsExample ? "rgba(56, 189, 248, 0.55)" : "rgba(255,255,255,0.10)"
          }`,
          cursor: "pointer",
          userSelect: "none",
          whiteSpace: "nowrap",
          transition: "background-color 120ms ease, border-color 120ms ease, color 120ms ease",
        }}
        title="Also save this design as a reusable starter template"
      >
        <input
          type="checkbox"
          checked={saveAsExample}
          onChange={(e) => setSaveAsExample(e.target.checked)}
          style={{
            width: 14,
            height: 14,
            margin: 0,
            accentColor: "#38bdf8",
            cursor: "pointer",
          }}
        />
        <span style={{ fontWeight: 500, letterSpacing: "-0.005em" }}>
          {saveAsExample ? "Saving as example" : "Save as example"}
        </span>
      </label>
      <button
        type="button"
        className="email-editor-header-primary"
        style={{
          ...headerPrimaryButtonStyle,
          opacity: saving ? 0.7 : 1,
          cursor: saving ? "wait" : "pointer",
        }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save Design"}
      </button>
    </>
  );

  if (loadError) {
    return (
      <div style={outerStyle}>
        <SiteHeader
          actions={
            <Link
              href="/"
              className="email-editor-header-ghost"
              style={headerLinkButtonStyle}
            >
              ← Back
            </Link>
          }
        />
        <div
          style={{
            padding: 40,
            fontFamily: "Arial",
            color: "#dc2626",
            textAlign: "center",
          }}
        >
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      <SiteHeader actions={headerActions} />

      <div style={metaBarStyle}>
        <span style={isNew ? eyebrowBadgeActiveStyle : eyebrowBadgeStyle}>
          {isNew ? "New template" : "Editing"}
        </span>
        <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 6, minWidth: 0 }}>
          <span style={fieldLabelStyle}>Name</span>
          <input
            className="email-editor-input"
            style={{ ...metaInputStyle, flex: 1, maxWidth: 300 }}
            placeholder="Untitled template"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", flex: 2, gap: 6, minWidth: 0 }}>
          <span style={fieldLabelStyle}>Subject</span>
          <input
            className="email-editor-input"
            style={{ ...metaInputStyle, flex: 1 }}
            placeholder="Email subject line"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      </div>

      <div style={variablesBarStyle}>
        <span style={fieldLabelStyle}>Variables</span>
        {variables.length === 0 ? (
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            None yet — add one to insert{" "}
            <code
              style={{
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                color: "#64748b",
              }}
            >{`{{name}}`}</code>{" "}
            tokens
          </span>
        ) : (
          variables.map((v) => (
            <span key={v} className="email-editor-chip" style={chipStyle}>
              <button
                type="button"
                className="email-editor-chip-token"
                style={chipButtonStyle}
                onClick={() => insertMergeTag(v)}
                title={`Insert {{${v}}} into the selected element`}
              >{`{{${v}}}`}</button>
              <button
                type="button"
                className="email-editor-chip-remove"
                style={chipRemoveStyle}
                onClick={() => removeVariable(v)}
                title={`Remove variable ${v}`}
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))
        )}
        <form
          onSubmit={handleAddSubmit}
          style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}
        >
          <input
            className="email-editor-input"
            style={varInputStyle}
            placeholder="new_variable"
            value={newVarInput}
            onChange={(e) => setNewVarInput(e.target.value)}
          />
          <button
            type="submit"
            className="email-editor-add"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              background: "#0f172a",
              color: "#f8fafc",
              border: "1px solid #0f172a",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              transition: "background-color 120ms ease",
            }}
          >
            <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>+</span>
            Add
          </button>
        </form>
      </div>

      <div ref={containerRef} style={editorShellStyle} />
    </div>
  );
}
