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
  // A regra padrão de imagens do next-pwa é uma RegExp pura — o Workbox só
  // casa RegExp contra origem cruzada se o match começar no índice 0, e a URL
  // do Blob (produto/uuid.jpg) nunca começa assim. Sem esta entrada, fotos de
  // produto caem no catch-all "cross-origin" genérico (NetworkFirst, 32
  // entradas somadas com Clerk/Turnstile/etc.) e podem sumir da tela do PWA
  // instalado quando esse pool de cache estoura ou a rede solta.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) => url.hostname.endsWith(".public.blob.vercel-storage.com"),
        handler: "CacheFirst",
        options: {
          cacheName: "product-photos",
          expiration: { maxEntries: 300, maxAgeSeconds: 2592000 }, // 30 dias — cada upload gera um UUID novo, nunca sobrescreve
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
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
  // data: em font-src: html-to-image embute fontes como data: ao gerar o recibo
  "font-src 'self' data: https://fonts.gstatic.com",
  // Blob em connect-src: no WebKit/Android a requisição de <img> interceptada
  // pelo service worker é julgada pelo connect-src, não pelo img-src — sem
  // isso as fotos de produto somem no PWA/mobile (diagnosticado on-device).
  `connect-src 'self' ${clerkOrigin()} https://clerk-telemetry.com https://challenges.cloudflare.com https://*.public.blob.vercel-storage.com`,
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
