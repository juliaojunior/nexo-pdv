"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CategoryManager } from "@/components/CategoryManager";

export default function SettingsPage() {
  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-32 max-w-md mx-auto w-full">
      <header className="mb-8 flex gap-4 items-center">
        <Link href="/more" className="bg-[#20201f] text-[#53ddfc] p-3 rounded-full border border-[#484847]/30 hover:bg-[#004b58]/50 active:scale-90 transition-all shadow-sm flex items-center justify-center">
          <ArrowLeft size={20} strokeWidth={3} />
        </Link>
        <div>
          <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Configurações</h1>
          <p className="text-[#adaaaa] text-xs mt-0.5 uppercase tracking-widest font-bold">Ajustes Básicos do PDV</p>
        </div>
      </header>
      
      <div className="flex flex-col gap-6">
        {/* Painel Gestão de Categorias */}
        <section>
          <CategoryManager />
        </section>

        {/* ... Área reservada para futuras métricas de impressora EPSON, layout UI, etc ... */}
      </div>
    </div>
  );
}
