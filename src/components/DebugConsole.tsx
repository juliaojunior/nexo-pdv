"use client";

import { useEffect } from "react";

// Console de depuração on-device (eruda), TEMPORÁRIO — para diagnosticar o
// sumiço das fotos de produto em aparelhos móveis. Só ativa com ?debug=1 na
// URL; invisível no uso normal. Remover quando o bug for resolvido.
//
// Além do console, roda um AUTODIAGNÓSTICO: violações de CSP e erros de <img>
// não passam pela API de console (o eruda não os vê), então escutamos os
// eventos do navegador e sondamos ativamente uma foto conhecida do Blob pelos
// dois caminhos (elemento <img> = img-src; fetch() = connect-src).
const PROBE_URL =
  "https://fxn3nvgdrh5wz0bh.public.blob.vercel-storage.com/products/user_3Fxj1P9Y3WqYiWLDasQ5CLjmBmF/ea5e6610-fd5e-452b-8f9e-ac513fea62a0.jpeg";

function runProbes() {
  document.addEventListener("securitypolicyviolation", (e) => {
    console.error(
      `[DIAG] VIOLAÇÃO DE CSP: diretiva=${e.violatedDirective} bloqueou=${e.blockedURI}`
    );
  });

  window.addEventListener(
    "error",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === "IMG") {
        console.error(`[DIAG] IMG FALHOU: ${(t as HTMLImageElement).src.slice(0, 130)}`);
      }
    },
    true
  );

  const img = new Image();
  img.onload = () =>
    console.log(`[DIAG] SONDA <img>: OK (${img.naturalWidth}x${img.naturalHeight})`);
  img.onerror = () => console.error("[DIAG] SONDA <img>: FALHOU");
  img.src = `${PROBE_URL}?diag=${Date.now()}`; // query única: fura qualquer cache

  fetch(`${PROBE_URL}?diagfetch=${Date.now()}`, { mode: "no-cors" })
    .then((r) => console.log(`[DIAG] SONDA fetch(): OK (type=${r.type} status=${r.status})`))
    .catch((err) => console.error(`[DIAG] SONDA fetch(): FALHOU — ${err?.message || err}`));

  console.log(
    `[DIAG] contexto: controlado por service worker? ${!!navigator.serviceWorker?.controller} | UA: ${navigator.userAgent.slice(0, 90)}`
  );
}

export function DebugConsole() {
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const s = document.createElement("script");
    s.src = "/eruda.js";
    s.onload = () => {
      (window as unknown as { eruda?: { init: () => void } }).eruda?.init();
      runProbes();
    };
    document.body.appendChild(s);
  }, []);
  return null;
}
