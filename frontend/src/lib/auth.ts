/*
 * Sessão do painel. O token vem de POST /auth/verify-code e vai em todo
 * request ao backend (ver api.ts). Quem valida é o servidor: aqui só
 * guardamos o token e mandamos para /login quando ele falta ou é recusado.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "auth_token";
const EMAIL_KEY = "auth_email";

export const LOGIN_PATH = "/login/";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return read(TOKEN_KEY);
}

export function getSessionEmail(): string | null {
  return read(EMAIL_KEY);
}

function saveSession(token: string, email: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* storage indisponível: a sessão dura só esta aba */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* nada a limpar */
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Token recusado pelo servidor: limpa a sessão e volta para o login. */
export function handleUnauthorized() {
  clearSession();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = LOGIN_PATH;
  }
}

export function logout() {
  clearSession();
  window.location.href = LOGIN_PATH;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(data?.message ?? `Erro ${res.status}`);
  return data as T;
}

export const authApi = {
  requestCode: (email: string) => post<{ ok: true }>("/auth/request-code", { email }),
  verifyCode: async (email: string, code: string) => {
    const { token, email: confirmed } = await post<{ token: string; email: string }>(
      "/auth/verify-code",
      { email, code },
    );
    saveSession(token, confirmed);
    return confirmed;
  },
};
