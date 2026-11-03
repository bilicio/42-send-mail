"use client";

import { useState, type FormEvent } from "react";
import { authApi } from "@/lib/auth";

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-50";
const buttonClass =
  "h-11 w-full rounded-lg bg-[#0b1220] text-[14px] font-semibold text-white transition hover:bg-[#1a2333] disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await authApi.requestCode(email.trim());
      setStep("code");
      setCode("");
      setNotice(`Enviamos um código de 6 dígitos para ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyCode(email.trim(), code);
      // Navegação completa: o AuthGuard relê o token ao montar a Home.
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f9f9] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-[7px]"
            style={{ background: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 55%, #0b1220 140%)" }}
          >
            <span className="h-[8px] w-[8px] rotate-45 rounded-[1.5px] bg-white/85" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
            Email Editor
          </span>
        </div>

        <h1 className="mb-1 text-[20px] font-semibold text-slate-900">Entrar</h1>
        <p className="mb-6 text-[13.5px] text-slate-500">
          {step === "email"
            ? "Digite seu email para receber um código de acesso."
            : notice}
        </p>

        {step === "email" ? (
          <form onSubmit={requestCode} className="space-y-3">
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
            <button type="submit" className={buttonClass} disabled={loading || !email.trim()}>
              {loading ? "Enviando…" : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-3">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputClass} text-center font-mono text-[22px] tracking-[0.5em]`}
              disabled={loading}
            />
            <button type="submit" className={buttonClass} disabled={loading || code.length !== 6}>
              {loading ? "Verificando…" : "Entrar"}
            </button>
            <div className="flex justify-between pt-1 text-[12.5px]">
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setStep("email");
                  setError(null);
                }}
                disabled={loading}
              >
                Trocar email
              </button>
              <button
                type="button"
                className="text-sky-600 hover:text-sky-800"
                onClick={() => requestCode()}
                disabled={loading}
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
