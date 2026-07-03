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
      const measure = () => {
        const nav = document.querySelector("nav");
        if (!nav) return console.log("[DIAG] nav ausente do DOM");
        const r = nav.getBoundingClientRect();
        const cs = getComputedStyle(nav);
        console.log(
          `[DIAG] nav rect: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} h=${Math.round(r.height)} w=${Math.round(r.width)} | janela: innerH=${window.innerHeight} visualH=${Math.round(window.visualViewport?.height ?? 0)}`
        );
        console.log(
          `[DIAG] nav css: pos=${cs.position} bottom=${cs.bottom} display=${cs.display} vis=${cs.visibility} op=${cs.opacity} z=${cs.zIndex} bg=${cs.backgroundColor.slice(0, 40)}`
        );
        // position:fixed quebra se um ancestral tem transform/filter/backdrop-filter
        let el = nav.parentElement; const culpados: string[] = [];
        while (el) {
          const s = getComputedStyle(el);
          if (s.transform !== "none" || s.filter !== "none" || (s as unknown as { backdropFilter?: string }).backdropFilter !== "none" || s.willChange.includes("transform")) {
            culpados.push(`${el.tagName}.${String(el.className).slice(0, 40)}`);
          }
          el = el.parentElement;
        }
        console.log(`[DIAG] ancestrais que quebram fixed: ${culpados.length ? culpados.join(" | ") : "NENHUM"}`);
      };
      setTimeout(measure, 2000);
      setTimeout(measure, 6000);
    };
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    console.log(`[DIAG] Clerk client: isLoaded=${isLoaded} isSignedIn=${isSignedIn} userId=${userId ?? "nenhum"}`);
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
