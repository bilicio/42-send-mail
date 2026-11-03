"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getToken, LOGIN_PATH } from "@/lib/auth";

/*
 * Sem token, qualquer página manda para /login; com token, /login manda para
 * a Home. Se o token tiver expirado, o primeiro request recebe 401 e
 * handleUnauthorized (api.ts) faz o mesmo redirecionamento.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname?.startsWith("/login") ?? false;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hasToken = Boolean(getToken());
    if (!hasToken && !isLogin) {
      router.replace(LOGIN_PATH);
      return;
    }
    if (hasToken && isLogin) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [isLogin, router]);

  // Nada é renderizado antes da checagem, para o painel não piscar na tela.
  return ready ? <>{children}</> : null;
}
