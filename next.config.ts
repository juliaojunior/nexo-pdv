import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Cacheia paginas visitadas via navegacao SPA (shell offline). Leituras de API
  // offline ficam no cache Dexie de proposito: SW cachear API autenticada
  // duplicaria a fonte de verdade e sobreviveria ao logout.
  cacheOnFrontEndNav: true,
});

// Origem do Clerk derivada da própria publishable key (o domínio do Frontend API
// vem codificado em base64 nela). Assim a migração dev → production é SÓ trocar
// as envs pk_live/sk_live: o CSP acompanha sem novo edit aqui.
function clerkOrigin(): string {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  try {
    const domain = Buffer.from(pk.replace(/^pk_(test|live)_/, ""), "base64")
      .toString("utf8")
      .replace(/\$$/, "");
    if (domain) return `https://${domain}`;
  } catch {}
  return "https://*.clerk.accounts.dev"; // fallback: instância dev
}

// Origens externas reais do app (mapeadas na auditoria de 2026-07):
// - Clerk: script/conexão no domínio da instância + avatares em img.clerk.com
// - Cloudflare Turnstile (bot check do Clerk): script + iframe
// - Google Fonts: só o Material Symbols é runtime (Inter é self-hosted via next/font)
// - Vercel Blob: fotos de produto (upload via /api/upload)
// - data:/blob: em img-src: fallback offline base64 + previews locais
// 'unsafe-inline' em script-src: exigido pelo Next sem infra de nonce (PWA/estático).
// 'unsafe-eval' só em dev (react-refresh do webpack).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} ${clerkOrigin()} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://img.clerk.com https://*.public.blob.vercel-storage.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${clerkOrigin()} https://clerk-telemetry.com https://challenges.cloudflare.com`,
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
