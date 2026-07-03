"use client";

import { useEffect } from "react";

// Console de depuração on-device (eruda), TEMPORÁRIO — para diagnosticar o
// sumiço das fotos de produto em aparelhos Android. Só ativa com ?debug=1 na
// URL; invisível no uso normal. Remover quando o bug for resolvido.
export function DebugConsole() {
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const s = document.createElement("script");
    s.src = "/eruda.js";
    s.onload = () => (window as unknown as { eruda?: { init: () => void } }).eruda?.init();
    document.body.appendChild(s);
  }, []);
  return null;
}
