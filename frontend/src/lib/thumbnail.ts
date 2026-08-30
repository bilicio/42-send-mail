import { toPng } from "html-to-image";

/*
 * Render a fully-formed HTML document into an off-screen iframe, wait for
 * images to load, snapshot it via html-to-image, and return a PNG blob
 * suitable for uploading to /template-images.
 *
 * We use a real iframe rather than injecting into the current document to
 * fully isolate MJML's compiled CSS (it ships table-based layout hacks that
 * can leak into the host page otherwise).
 */
/*
 * Render compiled HTML off-screen, wait for images, then snapshot at the
 * content's natural layout width. MJML compiles to fixed-width tables (600px
 * by default) plus outer wrappers, so we render the iframe at 700px, measure
 * the actual laid-out body, and hand those exact dimensions to html-to-image.
 * Forcing arbitrary width/height on toPng squashes content when the layout
 * doesn't match — measuring first avoids that.
 */
export async function captureHtmlThumbnail(
  html: string,
  options: { renderWidth?: number; maxHeight?: number } = {},
): Promise<Blob> {
  const renderWidth = options.renderWidth ?? 700;
  const maxHeight = options.maxHeight ?? 1400;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${renderWidth}px`,
    "height:2000px",
    "border:0",
    "opacity:0",
    "pointer-events:none",
    "background:#ffffff",
  ].join(";");
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("iframe has no document");
    doc.open();
    doc.write(html);
    doc.close();

    await waitForImages(doc);
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const body = (doc.body ?? doc.documentElement) as HTMLElement;
    const naturalWidth = Math.max(
      body.scrollWidth,
      body.getBoundingClientRect().width || 0,
    );
    const naturalHeight = Math.min(
      Math.max(body.scrollHeight, body.getBoundingClientRect().height || 0),
      maxHeight,
    );

    // Pre-warm the browser cache for every image referenced in the DOM.
    // html-to-image fetches each image URL again via fetch() to inline as a
    // data URL; when the images are already in the HTTP cache the second
    // fetch is instant AND won't cause the whole capture to throw if the
    // server hiccups on the retry.
    await preloadImageUrls(doc);

    const dataUrl = await toPng(body, {
      width: naturalWidth,
      height: naturalHeight,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      // cacheBust re-fetches with ?<ts> and defeats browser cache; skipFonts
      // avoids the Google Fonts cross-origin cssRules SecurityError.
      cacheBust: false,
      skipFonts: true,
      // 1×1 transparent PNG. Any failed image swaps to this instead of
      // aborting the capture with an unhandled Event.
      imagePlaceholder:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      filter: (node) => {
        // Drop external font/link/script tags that can't be inlined and
        // whose fetch would otherwise error out during capture.
        const tag = (node as Element).tagName?.toLowerCase?.();
        if (tag === "link" || tag === "script") {
          return false;
        }
        return true;
      },
    });
    return await dataUrlToBlob(dataUrl);
  } finally {
    iframe.remove();
  }
}

/*
 * Warm the browser cache for every referenced image — both <img> src and
 * CSS background-image URLs. html-to-image re-fetches each image, and if
 * the network hiccups on that second call it throws an unrecoverable Event.
 * Serving from cache sidesteps that.
 */
async function preloadImageUrls(doc: Document): Promise<void> {
  const urls = new Set<string>();
  for (const img of Array.from(doc.images)) {
    if (img.src) urls.add(img.src);
  }
  const all = doc.querySelectorAll<HTMLElement>("*");
  const bgRegex = /url\((['"]?)([^'")]+)\1\)/gi;
  for (const el of Array.from(all)) {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") continue;
    let m: RegExpExecArray | null;
    while ((m = bgRegex.exec(bg)) !== null) {
      if (m[2].startsWith("http")) urls.add(m[2]);
    }
  }
  await Promise.all(
    Array.from(urls).map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 5000);
          img.src = url;
        }),
    ),
  );
}

async function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          // Safety: don't block save on a broken image forever.
          setTimeout(done, 4000);
        }),
    ),
  );
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}
