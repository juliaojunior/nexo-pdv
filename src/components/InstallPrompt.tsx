"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";

// Evento não-padrão do Chrome (não está no lib.dom). Guardamos para disparar
// o prompt nativo no clique do usuário.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Banner discreto "Instalar o Nexo". Só aparece no Chrome/Android quando o app
// é instalável e ainda não está instalado (display-mode: standalone).
export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Vitrine pública (/c/[storeId]) é vista pelo cliente final, não pela lojista
  // — instalar "o Nexo" não faz sentido pra quem só está fazendo um pedido.
  const isPublicStorefront = pathname.startsWith("/c/") || pathname === "/c";

  useEffect(() => {
    if (isPublicStorefront) return;
    // Já rodando como app instalado → nunca mostra
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // impede o mini-infobar; guardamos para usar no clique
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isPublicStorefront]);

  if (isPublicStorefront || !deferred || dismissed) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null); // o navegador não reemite o evento; some após a escolha
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-surface border border-border/50 shadow-overlay rounded-2xl pl-4 pr-2 py-2.5 max-w-md w-full">
        <div className="bg-primary-deep/10 text-primary-bright p-2 rounded-xl shrink-0">
          <Download size={20} />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-foreground font-bold text-sm leading-tight">Instalar o Nexo</span>
          <span className="text-muted text-[11px] leading-tight">Acesso rápido na tela inicial, funciona offline.</span>
        </div>
        <button
          onClick={handleInstall}
          className="bg-primary text-primary-deep font-black text-xs uppercase tracking-wider px-3 py-2.5 rounded-xl active:scale-95 transition-transform shrink-0"
        >
          Instalar
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dispensar"
          className="text-muted hover:text-foreground p-1 rounded-lg shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
