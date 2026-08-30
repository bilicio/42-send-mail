/*
 * API client for the template-builder backend (Feathers.js on :3030, copied
 * from the legacy 42-send-mail project). Keeps the exact same routes and
 * payload shapes so the backend can be swapped in without changes.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  design_json: Record<string, unknown>;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateData {
  name: string;
  subject: string;
  html_content: string;
  design_json: Record<string, unknown>;
  variables: string[];
}

export interface SendEmailPayload {
  templateId: string;
  to: string;
  subject?: string;
  variables: Record<string, string>;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  template_id: string;
  template_name: string;
  status: "success" | "error";
  error_message: string;
  created: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `${method} ${path} failed (${res.status})`;
    try {
      const err = (await res.json()) as { message?: string };
      if (err?.message) msg = err.message;
    } catch {
      /* body wasn't json */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

/*
 * "Example template" metadata is stored inside design_json.__meta so the
 * feature doesn't require changes to the PocketBase collection schema. The
 * thumbnail itself is uploaded as a real image file via /template-images and
 * we only keep the returned URL here.
 */
export interface TemplateMeta {
  is_example: boolean;
  thumbnail_url: string | null;
}

const META_KEY = "__meta";

export function getTemplateMeta(t: EmailTemplate | null | undefined): TemplateMeta {
  const raw = (t?.design_json as Record<string, unknown> | null | undefined)?.[
    META_KEY
  ] as Partial<TemplateMeta> | undefined;
  return {
    is_example: Boolean(raw?.is_example),
    thumbnail_url: typeof raw?.thumbnail_url === "string" ? raw.thumbnail_url : null,
  };
}

export function mergeTemplateMeta(
  designJson: Record<string, unknown> | null | undefined,
  meta: Partial<TemplateMeta>,
): Record<string, unknown> {
  const base = designJson ?? {};
  const current = (base[META_KEY] as Partial<TemplateMeta> | undefined) ?? {};
  const merged: TemplateMeta = {
    is_example: meta.is_example ?? Boolean(current.is_example),
    thumbnail_url:
      meta.thumbnail_url !== undefined ? meta.thumbnail_url : current.thumbnail_url ?? null,
  };
  return { ...base, [META_KEY]: merged };
}

export interface TemplateImage {
  id: string;
  name: string;
  alt: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export const templateImagesApi = {
  upload: async (blob: Blob, name: string): Promise<TemplateImage> => {
    const form = new FormData();
    form.append("name", name);
    form.append("file", blob, name);
    // Uses the dedicated /template-thumbnails route (JSON response). The
    // Feathers /template-images service has a wiring bug with multer that
    // returns 500; this endpoint bypasses that by handling the multipart
    // upload directly in Express.
    const res = await fetch(`${BASE_URL}/template-thumbnails`, {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }
    const payload = (await res.json()) as { id: string; url: string; name: string };
    const now = new Date().toISOString();
    return {
      id: payload.id,
      name: payload.name,
      alt: "",
      url: payload.url,
      created_at: now,
      updated_at: now,
    };
  },
};

export const templatesApi = {
  list: async (): Promise<EmailTemplate[]> => {
    const payload = await request<unknown>("GET", "/templates");
    return extractList<EmailTemplate>(payload);
  },
  get: (id: string) => request<EmailTemplate>("GET", `/templates/${id}`),
  create: (data: EmailTemplateData) =>
    request<EmailTemplate>("POST", "/templates", data),
  update: (id: string, data: Partial<EmailTemplateData>) =>
    request<EmailTemplate>("PATCH", `/templates/${id}`, data),
  remove: (id: string) => request<void>("DELETE", `/templates/${id}`),
  duplicate: async (id: string): Promise<EmailTemplate> => {
    const original = await request<EmailTemplate>("GET", `/templates/${id}`);
    return request<EmailTemplate>("POST", "/templates", {
      name: `${original.name} (copy)`,
      subject: original.subject,
      html_content: original.html_content,
      design_json: original.design_json,
      variables: original.variables,
    });
  },
};

export const sendEmailApi = {
  send: (payload: SendEmailPayload) =>
    request<{ ok: true }>("POST", "/send-email", payload),
};

export const emailLogsApi = {
  list: async (): Promise<EmailLog[]> => {
    const payload = await request<unknown>("GET", "/email-logs");
    return extractList<EmailLog>(payload);
  },
};

export function detectVariables(html: string): string[] {
  const matches = html.matchAll(/\{\{(\w+)\}\}/g);
  const set = new Set<string>();
  for (const m of matches) set.add(m[1]);
  return Array.from(set);
}
