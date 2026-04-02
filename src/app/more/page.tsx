"use client";

import { useState } from "react";
import { Settings, Users, PackageMinus, LogOut, ChevronRight, Share2, Compass, QrCode } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { generateCatalogLink } from "@/lib/catalogSharing";
import { toast } from "sonner";

export default function MorePage() {
  const products = useLiveQuery(() => db.products.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const [isSharing, setIsSharing] = useState(false);

  const handleShareMenu = async () => {
    if (!products || !categories) return;
    if (products.length === 0) {
      toast.error("O catálogo está vazio! Adicione produtos primeiro.");
      return;
    }
    
    if (isSharing) return;
    setIsSharing(true);

    try {
      const compressedLink = generateCatalogLink(products, categories);
      let finalLink = compressedLink;
      
      // Encurtador de Link Inteligente
      toast.info("Aguarde. Encurtando o link da loja...", { duration: 1500 });
      
      const res = await fetch("/api/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: compressedLink })
      });
      
      if (res.ok) {
         const data = await res.json();
         if (data.shortUrl) {
           finalLink = data.shortUrl;
         }
      }

      // Tenta Copiar
      await navigator.clipboard.writeText(finalLink).catch(() => {});
      toast.success("Link encurtado copiado! Pode usar no Insta.");

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
    { icon: PackageMinus, label: "Ajuste de Estoque", description: "Balanços e perdas manuais", href: undefined },
    { icon: Settings, label: "Configurações", description: "Categorias, Impressora e Temas", href: "/more/settings" },
  ];

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-32 max-w-md mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Mais Opções</h1>
        <p className="text-[#adaaaa] text-sm mt-1">Recursos adicionais e gerência da loja</p>
      </header>

      <div className="flex flex-col gap-3">

        {/* CÉLULA ESPECIAL DE COMPARTILHAMENTO DE CARDÁPIO */}
        <button 
          onClick={handleShareMenu}
          className="bg-gradient-to-br from-[#06B6D4]/30 via-[#004b58] to-[#121212] p-[1.5px] rounded-2xl mb-4 group active:scale-[0.98] transition-all shadow-[0_4px_32px_rgba(6,182,212,0.15)] w-full text-left"
        >
          <div className="bg-[#1a1a1a] w-full h-full rounded-[14px] p-4 flex flex-col justify-between overflow-hidden relative">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#53ddfc]/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-[#53ddfc]/20 transition-all" />
             
             <div className="flex items-center gap-4 z-10 w-full mb-2">
                 <div className="bg-gradient-to-tr from-[#06B6D4] to-[#53ddfc] p-3.5 rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                   <QrCode size={24} className="text-[#004b58]" />
                 </div>
                 <div className="flex flex-col flex-1">
                   <h3 className="font-black text-white text-xl tracking-tight leading-none mb-1">Menu Digital</h3>
                   <p className="text-[#adaaaa] text-xs font-semibold uppercase tracking-widest leading-tight">{isSharing ? 'Gerando Link Curto...' : 'Link Mágico do Catálogo'}</p>
                 </div>
                 <div className={`bg-[#20201f] p-2 rounded-full border border-[#53ddfc]/20 text-[#53ddfc] transition-all ${isSharing ? 'animate-pulse' : 'group-hover:animate-pulse'}`}>
                   {isSharing ? <Compass size={20} className="animate-spin" /> : <Share2 size={20} />}
                 </div>
             </div>
             <p className="text-[#adaaaa] text-xs leading-relaxed z-10 pl-1 pb-1 mt-2">Toque para gerar um pequeno Link Profundo com todo o seu estoque vivo e enviar no WhatsApp ou Bio do Insta para seus clientes pedirem online.</p>
          </div>
        </button>


        {menuItems.map((item, i) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className="flex items-center gap-4">
                <div className="bg-[#20201f] p-3 rounded-xl border border-[#484847]/20 group-hover:bg-[#004b58]/30 transition-colors">
                  <Icon size={24} className="text-[#53ddfc]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white text-lg tracking-tight">{item.label}</span>
                  <span className="text-[#adaaaa] text-xs font-medium">{item.description}</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#adaaaa] group-hover:text-[#53ddfc] transition-colors" />
            </>
          );

          const classNameStr = "bg-[#1a1a1a] p-4 rounded-2xl flex items-center justify-between border border-[#484847]/30 hover:border-[#53ddfc]/50 shadow-sm active:scale-[0.98] transition-all w-full text-left group";
          
          if (item.href) {
            return (
              <Link key={i} href={item.href} className={classNameStr}>
                {content}
              </Link>
            )
          }

          return (
            <button key={i} className={classNameStr}>
              {content}
            </button>
          )
        })}
      </div>

      {/* Danger Zone */}
      <div className="mt-10 pt-6 border-t border-[#484847]/30">
        <SignOutButton>
          <button className="flex items-center gap-3 text-[#ff716c] hover:bg-[#ff716c]/10 bg-transparent p-4 rounded-2xl font-bold active:scale-95 transition-all w-full text-left">
            <LogOut size={22} />
            <span className="text-lg">Desconectar Dispositivo</span>
          </button>
        </SignOutButton>
      </div>
      
      {/* App Version Branding Footer */}
      <div className="mt-auto pt-16 pb-4 flex flex-col items-center justify-center opacity-40">
        <span className="text-[10px] font-black tracking-widest uppercase">Nexo PDV</span>
        <span className="text-[9px] font-medium">v0.1.0 • Offline-First PWA</span>
      </div>
    </div>
  );
}
