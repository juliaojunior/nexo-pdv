"use client";

import { Settings, Users, PackageMinus, LogOut, ChevronRight } from "lucide-react";

export default function MorePage() {
  // Configuração rápida de rotas simulando menus secundários da loja
  const menuItems = [
    { icon: Users, label: "Clientes", description: "Gerenciar base de clientes (Em breve)" },
    { icon: PackageMinus, label: "Ajuste de Estoque", description: "Balanços e perdas manuais" },
    { icon: Settings, label: "Configurações", description: "Preferências do sistema (Impressora, Temas)" },
  ];

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-32 max-w-md mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Mais Opções</h1>
        <p className="text-[#adaaaa] text-sm mt-1">Recursos adicionais e gerência da loja</p>
      </header>

      <div className="flex flex-col gap-3">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button key={i} className="bg-[#1a1a1a] p-4 rounded-2xl flex items-center justify-between border border-[#484847]/30 hover:border-[#53ddfc]/50 shadow-sm active:scale-[0.98] transition-all w-full text-left group">
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
            </button>
          )
        })}
      </div>

      {/* Danger Zone */}
      <div className="mt-10 pt-6 border-t border-[#484847]/30">
        <button className="flex items-center gap-3 text-[#ff716c] hover:bg-[#ff716c]/10 bg-transparent p-4 rounded-2xl font-bold active:scale-95 transition-all w-full text-left">
          <LogOut size={22} />
          <span className="text-lg">Desconectar Dispositivo</span>
        </button>
      </div>
      
      {/* App Version Branding Footer */}
      <div className="mt-auto pt-16 pb-4 flex flex-col items-center justify-center opacity-40">
        <span className="text-[10px] font-black tracking-widest uppercase">Nexo PDV</span>
        <span className="text-[9px] font-medium">v0.1.0 • Offline-First PWA</span>
      </div>
    </div>
  );
}
