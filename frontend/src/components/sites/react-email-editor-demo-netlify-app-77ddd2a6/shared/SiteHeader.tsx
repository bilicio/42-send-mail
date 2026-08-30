"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/*
 * Header chrome shared across every page. Left cluster: brand mark + wordmark
 * + version pill, then the primary section nav. Right cluster: page-specific
 * `actions` (Save/Preview/Export in the editor, "Back" elsewhere).
 *
 * Rendered as a dark control bar so the light editor canvas below reads as
 * the work surface, not another panel competing for attention.
 */

export type SiteHeaderActiveNav = "templates" | "logs" | null;

interface SiteHeaderProps {
  active?: SiteHeaderActiveNav;
  actions?: ReactNode;
}

export function SiteHeader({ active = null, actions }: SiteHeaderProps) {
  return (
    <header className="flex h-[60px] flex-shrink-0 items-center gap-4 border-b border-white/[0.06] bg-[#0b1220] px-4 text-slate-100">
      <Link
        href="/"
        className="group flex items-center gap-2.5 rounded-md px-1 py-1 transition-colors hover:bg-white/[0.04]"
        aria-label="Email Editor — home"
      >
        <span
          aria-hidden
          className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-[6px]"
          style={{
            background:
              "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 55%, #0b1220 140%)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.45)",
          }}
        >
          <span
            aria-hidden
            className="h-[7px] w-[7px] rotate-45 rounded-[1.5px] bg-white/85"
          />
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-slate-100">
            Email Editor
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-[1px] font-mono text-[10px] leading-none tracking-tight text-slate-400">
            v2.1.2
          </span>
        </span>
      </Link>

      <span aria-hidden className="h-5 w-px bg-white/[0.08]" />

      <nav className="flex items-center gap-1">
        <NavPill href="/" isActive={active === "templates"}>
          Templates
        </NavPill>
        <NavPill href="/logs" isActive={active === "logs"}>
          Logs
        </NavPill>
      </nav>

      <a
        href="https://github.com/unlayer/react-email-editor"
        target="_blank"
        rel="noreferrer"
        className="ml-1 hidden items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-200 sm:inline-flex"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="currentColor"
        >
          <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-2.09c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.28-1.67-1.28-1.67-1.04-.72.08-.71.08-.71 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.77.12 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
        </svg>
        GitHub
      </a>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {actions}
      </div>
    </header>
  );
}

function NavPill({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        isActive
          ? "rounded-md bg-white/[0.08] px-3 py-1.5 text-[13px] font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-colors"
          : "rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
      }
    >
      {children}
    </Link>
  );
}

/*
 * Button style tokens exported for pages that inject actions into the header.
 * Two flavors: primary (solid sky, used for Save) and ghost (subtle border,
 * used for Preview/Export/Send Test/Back). Kept as CSSProperties so the
 * existing pages can spread them without a rewrite.
 */

const buttonBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  height: 34,
  padding: "0 14px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "inherit",
  cursor: "pointer",
  transition:
    "background-color 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  textDecoration: "none",
  flexShrink: 0,
  letterSpacing: "-0.005em",
};

export const headerButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "rgba(255,255,255,0.04)",
  color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.10)",
};

export const headerLinkButtonStyle: CSSProperties = {
  ...headerButtonStyle,
};

export const headerPrimaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "#38bdf8",
  color: "#0b1220",
  border: "1px solid rgba(255,255,255,0.15)",
  fontWeight: 600,
  boxShadow:
    "0 1px 0 rgba(255,255,255,0.25) inset, 0 1px 2px rgba(3, 105, 161, 0.35)",
};

export const savedNoticeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11.5,
  color: "#86efac",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  fontWeight: 500,
  letterSpacing: "0.01em",
};
