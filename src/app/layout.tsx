import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { SyncProvider } from "@/components/SyncProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import OrderAlerts from "@/components/OrderAlerts";
import { ClerkProvider } from '@clerk/nextjs';
import { ptBR } from "@clerk/localizations";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  // Mesmo valor do background_color/theme_color do manifest (token --color-background
  // do tema claro) — splash e barra claras, sem tela preta.
  themeColor: "#f5f6f8",
  width: "device-width",
  initialScale: 1,
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexo.muitomelhor.net";
const TAGLINE = "Suas vendas de revenda, organizadas num lugar só";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Nexo PDV",
  description: TAGLINE,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nexo PDV",
  },
  icons: {
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Nexo PDV",
    title: "Nexo PDV",
    description: TAGLINE,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Nexo PDV" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexo PDV",
    description: TAGLINE,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={ptBR}>
      <html lang="pt-BR" className={inter.className}>
        <head>
          <link 
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
            rel="stylesheet" 
          />
        </head>
        <body className="antialiased min-h-screen bg-background flex flex-col text-foreground">
          {/* Renderiza a view de pagina correspondente */}
          <main className="flex-1 pb-20">
            {children}
          </main>
          
          {/* Componentes Globais Injetados */}
          <SyncProvider />
          <OrderAlerts />
          <InstallPrompt />
          <BottomNav />
          <Toaster position="top-center" theme="light" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
