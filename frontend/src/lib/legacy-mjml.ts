/*
 * Converts legacy email HTML (mostly exported by Unlayer in the old
 * 42-send-mail editor) into MJML the grapesjs-mjml editor can work with.
 *
 * grapesjs-mjml only lets its blocks be dropped into MJML parents — an
 * mj-button only goes into an mj-column, an mj-column only into an
 * mj-section, and so on. When a template is loaded as plain HTML there is no
 * MJML tree at all, so nothing from the block panel can be dragged into it.
 *
 * Unlayer HTML has a predictable structure, so we map it back:
 *   .u-row-container          → mj-section
 *   .u-col (u-col-50, …)      → mj-column (width from the class)
 *   table#u_content_text_*    → mj-text
 *   table#u_content_heading_* → mj-text
 *   table#u_content_button_*  → mj-button
 *   table#u_content_image_*   → mj-image
 *   table#u_content_divider_* → mj-divider
 *   anything else             → mj-raw (kept verbatim, still renders)
 *
 * HTML that isn't Unlayer's goes into a single mj-raw inside mj-body, so new
 * sections can at least be dragged above/below it.
 */

import { stripDefaultLinkBlue } from "./link-colors";

const MSO_COMMENTS = /<!--\[if[\s\S]*?<!\[endif\]-->|<!--<!\[endif\]-->|<!--\[if[^\]]*\]><!-->/g;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function attrs(map: Record<string, string | null | undefined>): string {
  return Object.entries(map)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => ` ${k}="${escapeAttr(String(v))}"`)
    .join("");
}

function cleanHtml(html: string): string {
  return html.replace(MSO_COMMENTS, "").trim();
}

function isTransparent(color: string | null | undefined): boolean {
  if (!color) return true;
  const c = color.replace(/\s/g, "").toLowerCase();
  return c === "transparent" || c === "rgba(0,0,0,0)";
}

function bg(el: Element | null | undefined): string | null {
  const color = (el as HTMLElement | null)?.style?.backgroundColor;
  return isTransparent(color) ? null : color ?? null;
}

function px(value: string | null | undefined): string | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)}px` : null;
}

function columnWidth(col: Element): string | null {
  // u-col-50 → 50%, u-col-33p33 → 33.33%
  const match = col.className.match(/u-col-(\d+)(?:p(\d+))?/);
  if (!match) return null;
  return `${match[1]}${match[2] ? `.${match[2]}` : ""}%`;
}

function borders(el: HTMLElement | null): Record<string, string | null> {
  if (!el) return {};
  const side = (name: "Top" | "Right" | "Bottom" | "Left") => {
    const width = el.style[`border${name}Width`];
    if (!width || parseFloat(width) === 0) return null;
    return el.style[`border${name}`] || null;
  };
  return {
    "border-top": side("Top"),
    "border-right": side("Right"),
    "border-bottom": side("Bottom"),
    "border-left": side("Left"),
  };
}

function contentPadding(table: Element): string | null {
  const td = table.querySelector<HTMLElement>("td.v-container-padding-padding");
  return td?.style.padding || null;
}

function contentType(table: Element): string {
  const id = table.id || "";
  const fromId = id.match(/^u_content_([a-z]+)_/);
  if (fromId) return fromId[1];
  // Unlayer omits the id on some blocks; detect a lone image.
  const td = table.querySelector("td.v-container-padding-padding");
  if (td && td.querySelectorAll("img").length === 1 && !td.textContent?.trim()) {
    return "image";
  }
  return "raw";
}

function convertText(table: Element): string {
  const td = table.querySelector("td.v-container-padding-padding");
  if (!td) return `<mj-raw>${cleanHtml(table.outerHTML)}</mj-raw>`;
  const font = (table as HTMLElement).style.fontFamily;
  return `<mj-text${attrs({
    padding: contentPadding(table) ?? "0px",
    "font-family": font || null,
  })}>${cleanHtml(td.innerHTML)}</mj-text>`;
}

function convertButton(table: Element): string {
  const a = table.querySelector<HTMLAnchorElement>("a");
  if (!a) return `<mj-raw>${cleanHtml(table.outerHTML)}</mj-raw>`;
  const span = a.querySelector<HTMLElement>("span");
  const wrapper = a.closest("div[align]");
  const label = cleanHtml((span ?? a).innerHTML);
  return `<mj-button${attrs({
    href: a.getAttribute("href"),
    target: a.getAttribute("target"),
    "background-color": a.style.backgroundColor || a.style.background || null,
    color: a.style.color || null,
    "border-radius": a.style.borderRadius || null,
    "font-size": a.style.fontSize || null,
    "font-family": a.style.fontFamily || (table as HTMLElement).style.fontFamily || null,
    "font-weight": a.style.fontWeight || null,
    "inner-padding": span?.style.padding || null,
    width: a.style.width && a.style.width !== "auto" ? a.style.width : null,
    align: wrapper?.getAttribute("align") ?? null,
    padding: contentPadding(table) ?? "10px",
  })}>${label}</mj-button>`;
}

function convertImage(table: Element): string {
  const img = table.querySelector<HTMLImageElement>("img");
  if (!img) return `<mj-raw>${cleanHtml(table.outerHTML)}</mj-raw>`;
  const link = img.closest("a");
  const cell = img.closest("td[align]");
  return `<mj-image${attrs({
    src: img.getAttribute("src"),
    alt: img.getAttribute("alt"),
    title: img.getAttribute("title"),
    href: link?.getAttribute("href") ?? null,
    width: px(img.getAttribute("width")),
    align: cell?.getAttribute("align") ?? null,
    padding: contentPadding(table) ?? "0px",
  })} />`;
}

function convertDivider(table: Element): string {
  const line = Array.from(table.querySelectorAll<HTMLElement>("table")).find(
    (t) => t.style.borderTopWidth,
  );
  return `<mj-divider${attrs({
    "border-width": line?.style.borderTopWidth || null,
    "border-style": line?.style.borderTopStyle || null,
    "border-color": line?.style.borderTopColor || null,
    width: line?.style.width || null,
    padding: contentPadding(table) ?? "10px",
  })} />`;
}

function convertContent(table: Element): string {
  switch (contentType(table)) {
    case "text":
    case "heading":
      return convertText(table);
    case "button":
      return convertButton(table);
    case "image":
      return convertImage(table);
    case "divider":
      return convertDivider(table);
    default:
      return `<mj-raw>${cleanHtml(table.outerHTML)}</mj-raw>`;
  }
}

function convertColumn(col: Element): string {
  // .u-col > div (background) > div (padding + borders) > content tables
  const bgBox = col.firstElementChild as HTMLElement | null;
  const inner = (bgBox?.querySelector(":scope > div") ?? bgBox) as HTMLElement | null;
  const contents = Array.from(inner?.children ?? []).filter((el) => el.tagName === "TABLE");
  return `<mj-column${attrs({
    width: columnWidth(col),
    "background-color": bg(bgBox),
    padding: inner?.style.padding && inner.style.padding !== "0px" ? inner.style.padding : null,
    ...borders(inner),
  })}>${contents.map(convertContent).join("")}</mj-column>`;
}

function convertRow(container: Element): string {
  const row = container.querySelector(".u-row");
  const cols = Array.from(row?.querySelectorAll(".u-col") ?? []);
  return `<mj-section${attrs({
    "background-color": bg(row) ?? bg(container),
    padding: "0px",
  })}>${cols.map(convertColumn).join("")}</mj-section>`;
}

function collectStyles(doc: Document): string {
  return Array.from(doc.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n")
    .trim();
}

export function isMjml(source: string): boolean {
  return /^\s*<mjml[\s>]/i.test(source);
}

export function legacyHtmlToMjml(html: string): string {
  if (isMjml(html)) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  stripDefaultLinkBlue(doc);
  const css = collectStyles(doc);
  const head = css ? `<mj-head><mj-style>${css}</mj-style></mj-head>` : "";

  const rows = Array.from(doc.querySelectorAll(".u-row-container"));
  if (rows.length > 0) {
    const bodyBg = bg(doc.getElementById("u_body")) ?? bg(doc.body);
    return `<mjml>${head}<mj-body${attrs({
      "background-color": bodyBg,
      width: "600px",
    })}>${rows.map(convertRow).join("")}</mj-body></mjml>`;
  }

  doc.querySelectorAll("style, script, meta, title, link").forEach((el) => el.remove());
  return `<mjml>${head}<mj-body${attrs({
    "background-color": bg(doc.body),
  })}><mj-raw>${cleanHtml(doc.body.innerHTML)}</mj-raw></mj-body></mjml>`;
}
