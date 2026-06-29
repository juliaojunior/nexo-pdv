"use client";

import { useState } from "react";
import { Settings, Users, PackageMinus, LogOut, Share2, Compass, QrCode, FileText, Wallet } from "lucide-react";
import Link from "next/link";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

export default function MorePage() {
  const { userId } = useAuth();
  const [isSharing, setIsSharing] = useState(false);

  const handleShareMenu = async () => {
    if (!userId) {
      toast.error("Erro interno. Identidade da Loja indisponível.");
      return;
    }
    
    if (isSharing) return;
    setIsSharing(true);

    try {
      // O novo catálogo Dinâmico (Cloud-First)
      const finalLink = `${window.location.origin}/c/${userId}`;

      // Tenta Copiar
      await navigator.clipboard.writeText(finalLink).catch(() => {});
      toast.success("Link Seguro copiado! Cole na bio do Insta.");

      // Share Tooltip Nativo
      if (navigator.share) {
          navigator.share({
            title: 'Cardápio Digital Nexo PDV',
            text: 'Selecione seus itens e envie o pedido aqui:',
            url: finalLink
          }).catch((err) => console.log('Share error:', err));
      }
    } catch (e) {
      toast.error("Erro interno ao gerar o link.");
    } finally {
      setIsSharing(false);
    }
  };

  const menuItems = [
    { icon: Users, label: "Clientes", description: "Gerenciar base de clientes", href: "/customers" },
    { icon: Wallet, label: "A Receber", description: "Fiado em aberto por cliente", href: "/receivables" },
    { icon: FileText, label: "Histórico de Caixa", description: "Extrato de vendas e Estornos", href: "/sales-history" },
    { icon: PackageMinus, label: "Ajuste de Estoque", description: "Balanços e perdas manuais", href: "/inventory" },
    { icon: Settings, label: "Configurações", description: "Dados da Loja, Categorias e Recibos", href: "/more/settings" },
  ];

  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter'] px-4 py-8 pb-32 max-w-md mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-primary-bright font-black tracking-tighter text-2xl">Mais Opções</h1>
        <p className="text-muted text-sm mt-1">Recursos adicionais e gerência da loja</p>
      </header>

      <div className="flex flex-col gap-4">

        {/* CÉLULA ESPECIAL DE COMPARTILHAMENTO DE CARDÁPIO */}
        <button 
          onClick={handleShareMenu}
          className="bg-gradient-to-br from-primary/30 via-primary-deep to-background p-[1.5px] rounded-2xl mb-4 group active:scale-[0.98] transition-all shadow-glow w-full text-left"
        >
          <div className="bg-surface w-full h-full rounded-[14px] p-4 flex flex-col justify-between overflow-hidden relative">
             
             <div className="flex items-center gap-4 z-10 w-full mb-2">
                 <div className="bg-gradient-to-tr from-primary to-primary-bright p-3.5 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                   <QrCode size={24} className="text-primary-deep" />
                 </div>
                 <div className="flex flex-col flex-1">
                   <h3 className="font-black text-foreground text-xl tracking-tight leading-none mb-1">Menu Digital</h3>
                   <p className="text-muted text-xs font-semibold uppercase tracking-widest leading-tight">{isSharing ? 'Gerando Link Curto...' : 'Link Mágico do Catálogo'}</p>
                 </div>
                 <div className={`bg-surface-raised p-2 rounded-full border border-primary-bright/20 text-primary-bright transition-all ${isSharing ? 'animate-pulse' : 'group-hover:animate-pulse'}`}>
                   {isSharing ? <Compass size={20} className="animate-spin" /> : <Share2 size={20} />}
                 </div>
             </div>
             <p className="text-muted text-xs leading-relaxed z-10 pl-1 pb-1 mt-2">Toque para gerar um pequeno Link Profundo com todo o seu estoque vivo e enviar no WhatsApp ou Bio do Insta para seus clientes pedirem online.</p>
          </div>
        </button>


        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const tile = "bg-surface rounded-2xl shadow-card p-4 flex flex-col gap-3 min-h-[124px] active:scale-[0.97] transition-transform group";
            const inner = (
              <>
                <div className="bg-surface-raised w-11 h-11 rounded-xl flex items-center justify-center group-hover:bg-primary-deep/30 transition-colors">
                  <Icon size={22} className="text-primary-bright" />
                </div>
                <div className="mt-auto">
                  <span className="font-bold text-foreground text-base tracking-tight block leading-tight">{item.label}</span>
                  <span className="text-muted text-[11px] font-medium leading-snug block mt-0.5">{item.description}</span>
                </div>
              </>
            );
            return item.href ? (
              <Link key={i} href={item.href} className={tile}>{inner}</Link>
            ) : (
              <button key={i} className={`${tile} text-left`}>{inner}</button>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-10 pt-6 border-t border-border/30">
        <SignOutButton>
          <button className="flex items-center gap-3 text-danger hover:bg-danger/10 bg-transparent p-4 rounded-2xl font-bold active:scale-95 transition-all w-full text-left">
            <LogOut size={22} />
            <span className="text-lg">Desconectar Dispositivo</span>
          </button>
        </SignOutButton>
      </div>
      
      {/* App Version Branding Footer */}
      <div className="mt-auto pt-16 pb-4 flex flex-col items-center justify-center opacity-40">
        <span className="text-[10px] font-bold tracking-widest uppercase">Nexo PDV</span>
        <span className="text-[10px] font-medium">v0.1.0 • Offline-First PWA</span>
      </div>
    </div>
  );
}
