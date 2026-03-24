import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Nexo PDV",
  description: "Sistema de Ponto de Venda Mobile-First e Offline",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nexo PDV",
  },
  icons: {
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" className={`${inter.className} dark`}>
        <head>
          <link 
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
            rel="stylesheet" 
          />
        </head>
        <body className="antialiased min-h-screen bg-[#121212] flex flex-col text-[#F3F4F6]">
          {/* Renderiza a view de pagina correspondente */}
          <main className="flex-1 pb-20">
            {children}
          </main>
          
          {/* Componentes Globais Injetados */}
          <BottomNav />
          <Toaster position="top-center" theme="dark" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
