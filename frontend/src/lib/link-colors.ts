/*
 * Links with no color of their own render in the client's default blue
 * (Gmail, Outlook, browsers), and Unlayer-era HTML hard-codes that blue
 * inline. Email clients don't reliably honor `color: inherit`, so we resolve
 * the actual text color around each link and write it inline on the <a>.
 *
 * Links whose color was set on purpose (mj-button, a custom color) are left
 * alone — only missing colors and the stock link blues are replaced.
 */

const DEFAULT_LINK_BLUES = new Set([
  "rgb(0, 0, 238)", // #0000ee — browser / Unlayer default
  "rgb(0, 0, 255)", // #0000ff
  "rgb(17, 85, 204)", // #1155cc — Gmail
  "rgb(6, 69, 173)", // #0645ad
]);

// CSSOM serializes hex colors as rgb(), so #0000ee and rgb(0,0,238) compare equal.
function normalizeColor(doc: Document, color: string): string {
  const probe = doc.createElement("span");
  probe.style.color = color;
  return probe.style.color || color;
}

export async function applyTextColorToLinks(html: string): Promise<string> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:600px;height:800px;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = html;
    });
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return html;

    let changed = false;
    doc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
      const inline = a.style.color;
      if (inline && !DEFAULT_LINK_BLUES.has(normalizeColor(doc, inline))) return;
      const parent = a.parentElement;
      if (!parent) return;
      const textColor = win.getComputedStyle(parent).color;
      if (!textColor || DEFAULT_LINK_BLUES.has(textColor)) return;
      a.style.color = textColor;
      changed = true;
    });
    if (!changed) return html;

    const doctype = doc.doctype ? new XMLSerializer().serializeToString(doc.doctype) : "";
    return `${doctype}\n${doc.documentElement.outerHTML}`;
  } catch {
    return html;
  } finally {
    iframe.remove();
  }
}

// Drops the stock-blue inline color from links (used on legacy HTML before
// it becomes MJML), so the editor shows them in the text color too.
export function stripDefaultLinkBlue(doc: Document): void {
  doc.querySelectorAll<HTMLAnchorElement>("a").forEach((a) => {
    if (a.style.color && DEFAULT_LINK_BLUES.has(normalizeColor(doc, a.style.color))) {
      a.style.removeProperty("color");
    }
  });
}

// Same look inside the editor canvas (not exported with the email). Inline
// colors (mj-button, custom link colors) still win over this rule.
export const LINK_INHERIT_CANVAS_CSS = "a { color: inherit; }";
