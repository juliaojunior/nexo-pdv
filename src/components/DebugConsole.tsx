"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

// Console de depuração on-device (eruda), TEMPORÁRIO — rodada 2: barra de
// navegação sumida no iPad. Só ativa com ?debug=1; remover após o diagnóstico.
export function DebugConsole() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const s = document.createElement("script");
    s.src = "/eruda.js";
    s.onload = () => {
      (window as unknown as { eruda?: { init: () => void } }).eruda?.init();
      document.addEventListener("securitypolicyviolation", (e) => {
        console.error(`[DIAG] CSP: ${e.violatedDirective} bloqueou ${String(e.blockedURI).slice(0, 90)} (arquivo: ${String(e.sourceFile).slice(-60)}:${e.lineNumber})`);
      });
      window.addEventListener("error", (e) => {
        if (e.message) console.error(`[DIAG] ERRO JS: ${e.message} @ ${String(e.filename).slice(-60)}:${e.lineno}`);
      });
      window.addEventListener("unhandledrejection", (e) => {
        console.error(`[DIAG] PROMISE REJEITADA: ${e.reason?.message || e.reason}`);
      });
      const nav = document.querySelector("nav");
      console.log(`[DIAG] BottomNav no DOM? ${!!nav} | path: ${location.pathname}`);
    };
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    console.log(`[DIAG] Clerk client: isLoaded=${isLoaded} isSignedIn=${isSignedIn} userId=${userId ?? "nenhum"}`);
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
