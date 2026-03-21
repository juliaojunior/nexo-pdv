"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { Search, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function ProductsPage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Seed inicial de Categorias Base (Muda nada caso já existam)
  useEffect(() => {
    async function seedCategories() {
      const count = await db.categories.count();
      if (count === 0) {
        await db.categories.bulkAdd([
          { name: "Bebidas" },
          { name: "Alimentos" },
          { name: "Limpeza" },
          { name: "Mercearia" },
          { name: "Outros" }
        ]);
      }
    }
    seedCategories();
  }, []);

  // Observa O Banco em Tempo Real
  const rawProducts = useLiveQuery(() => db.products.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // Lógica de Filtragem de Busca
  const products = rawProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const handleAddProduct = async (data: ProductFormValues) => {
    try {
      await db.products.add({
        name: data.name,
        categoryId: data.categoryId,
        price: data.price,
        barcode: data.barcode,
        stock: data.stock,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("Produto cadastrado com sucesso!");
      setModalOpen(false); // Fecha o form após salvar offline
    } catch (error) {
      toast.error("Erro ao salvar produto no banco offline Dexie.");
    }
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-28 relative">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Produtos</h1>
      </header>

      {/* Buscar de Produtos */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaaa]">
          <Search size={20} />
        </span>
        <input 
          type="text" 
          placeholder="Buscar produtos ou cód. barras..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#20201f] border border-[#484847]/40 rounded-xl py-3.5 pl-12 pr-4 outline-none text-white font-medium focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] transition-all shadow-sm shadow-[#0e0e0e]/50 placeholder:text-[#adaaaa]/50"
        />
      </div>

      {/* Lista Principal de Itens */}
      <div className="flex flex-col gap-3 pb-8">
        {products.length > 0 ? (
          products.map(product => {
             const catName = categories.find(c => c.id === product.categoryId)?.name || "Geral";
             return (
               <div key={product.id} className="bg-[#1a1a1a] p-4 rounded-2xl flex justify-between items-center border border-[#484847]/30 shadow-sm active:scale-[0.98] transition-transform cursor-pointer hover:bg-[#20201f]">
                 <div className="flex flex-col gap-1">
                   <span className="text-white font-bold leading-tight">{product.name}</span>
                   <div className="flex items-center gap-2 mt-0.5">
                     <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest bg-[#20201f] px-2 py-0.5 rounded-md border border-[#484847]/20">{catName}</span>
                     <span className="text-[#53ddfc] font-black tracking-tight text-sm px-1">{formatCurrency(product.price)}</span>
                   </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-1">
                   <div className="bg-[#20201f] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-inner">
                     <span className="font-black text-base">{product.stock}</span>
                     <span className="text-[#adaaaa] text-[10px] font-black uppercase tracking-widest leading-none">und</span>
                   </div>
                 </div>
               </div>
             )
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-[#1a1a1a] rounded-2xl border-2 border-dashed border-[#484847]/30 mt-4">
             <div className="bg-[#20201f] p-4 rounded-full mb-4">
                <Search size={28} className="text-[#adaaaa]" />
             </div>
             <p className="font-bold text-white tracking-wide">
                {rawProducts.length === 0 ? "O estoque está vázio" : "Nada encontrado"}
             </p>
             <p className="text-[#adaaaa] text-sm mt-1 mb-4 leading-relaxed max-w-[250px]">
                {rawProducts.length === 0 
                  ? "Pressione o botão '+' flutuante e crie o seu primeiro produto de catálogo."
                  : "Nenhum produto bate com essa pesquisa."}
             </p>
          </div>
        )}
      </div>

      {/* Componente FAB - Anchor Inferior */}
      <button 
        onClick={() => setModalOpen(true)}
        className="fixed bottom-[96px] right-5 bg-[#06B6D4] text-[#004b58] p-4 rounded-full shadow-[0_8px_32px_rgba(6,182,212,0.4)] active:scale-90 hover:scale-105 transition-all z-30 flex items-center justify-center"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* Aba de Modal Sobreposta -> Criação de Novo Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0e0e0e]/90 flex flex-col justify-end sm:items-center sm:justify-center backdrop-blur-md p-0 sm:p-4 animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-[#121212] w-full max-w-md sm:rounded-2xl border-t sm:border border-[#484847]/50 shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#484847]/20">
              <h2 className="text-xl font-black text-white tracking-tight">Novo Produto</h2>
              <button onClick={() => setModalOpen(false)} className="text-[#adaaaa] hover:text-[#ff716c] transition-colors p-2 rounded-full bg-[#20201f]">
                <X size={20} />
              </button>
            </div>
            
            {/* O formulário do Zod consumindo nosso Schema isolado */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col hide-scrollbar pb-32">
              <ProductForm 
                categories={categories} 
                onSubmit={handleAddProduct} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
