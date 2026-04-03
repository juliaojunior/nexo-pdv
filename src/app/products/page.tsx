"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { Search, Plus, X, Trash2, Tag, PercentCircle, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, isPromotionActive, getEffectivePrice } from "@/lib/utils";
import { uploadImageToImgBB } from "@/lib/imgbb";

export default function ProductsPage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados do Modal
  const [editingProduct, setEditingProduct] = useState<any>(null); // Trata form em modo Edição
  const [promoProduct, setPromoProduct] = useState<any>(null);
  const [promoPriceValue, setPromoPriceValue] = useState("");
  const [promoDateValue, setPromoDateValue] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<{id: number, name: string} | null>(null);
  
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

  const handleSaveProduct = async (data: any) => {
    try {
      let finalImageUrl = editingProduct ? editingProduct.image : data.image;

      // Se existir nova imagem local, envia para a nuvem
      if (data.image && data.image !== editingProduct?.image && data.image.startsWith("data:image")) {
         toast.info("Fazendo upload da foto para nuvem...", { duration: 1500 });
         finalImageUrl = await uploadImageToImgBB(data.image);
      }

      if (editingProduct) {
        await db.products.update(editingProduct.id, {
          name: data.name,
          categoryId: data.categoryId,
          price: data.price,
          barcode: data.barcode,
          image: finalImageUrl,
          stock: data.stock,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Produto editado e atualizado perfeitamente!");
      } else {
        await db.products.add({
          name: data.name,
          categoryId: data.categoryId,
          price: data.price,
          barcode: data.barcode,
          image: finalImageUrl,
          stock: data.stock,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("Novo produto catalogado com sucesso!");
      }

      setModalOpen(false); // Fecha o form
      setEditingProduct(null); // Reseta estado de edição
    } catch (error) {
      toast.error("Erro interno ao transacionar com o banco offline Dexie.");
    }
  };

  const openEditModal = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleDeleteProduct = (id: number, name: string) => {
    setDeleteCandidate({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await db.products.delete(deleteCandidate.id);
      toast.success(`Estoque do(a) ${deleteCandidate.name} foi expurgado.`);
      setDeleteCandidate(null);
    } catch (error) {
      toast.error("Erro ao tentar romper produto do catálogo.");
    }
  };

  const handleSavePromo = async () => {
    if (!promoProduct) return;
    if (!promoPriceValue || !promoDateValue) {
      toast.error("Preencha o valor promocional e a data limite corretamente.");
      return;
    }

    try {
      await db.products.update(promoProduct.id!, {
        promotionalPrice: parseFloat(promoPriceValue),
        promotionEndDate: new Date(promoDateValue).toISOString()
      });
      toast.success("Oferta ativada com sucesso no balcão!");
      setPromoProduct(null);
    } catch (e) {
      toast.error("Falha ao registrar oferta.");
    }
  };

  const handleRemovePromo = async () => {
    if (!promoProduct) return;
    try {
      await db.products.update(promoProduct.id!, {
        promotionalPrice: undefined,
        promotionEndDate: undefined
      });
      toast.success("Promoção recolhida. Preço originado foi restaurado.");
      setPromoProduct(null);
    } catch (e) {
      toast.error("Erro ao tentar remover oferta.");
    }
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-28 relative max-w-md mx-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Catálogo</h1>
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
             const promoActive = isPromotionActive(product);
             const activePrice = getEffectivePrice(product);

             return (
               <div key={product.id} className="bg-[#1a1a1a] p-3 rounded-2xl flex justify-between items-center border border-[#484847]/30 shadow-sm transition-transform hover:bg-[#20201f] group relative overflow-hidden">
                 
                 <div className="flex items-center gap-3 w-full pr-2 z-10">
                   {/* Mini Thumbnail */}
                   <div className="w-14 h-14 rounded-xl bg-[#20201f] border border-[#484847]/30 flex items-center justify-center overflow-hidden shrink-0 relative">
                     {product.image ? (
                       <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                     ) : (
                       <span className="font-bold text-[8px] text-[#adaaaa] tracking-widest uppercase">Foto</span>
                     )}
                   </div>
                   
                   <div className="flex flex-col gap-0.5 w-full justify-center">
                     <span className="text-white font-bold leading-tight line-clamp-1 pr-2">{product.name}</span>
                     <div className="flex items-center gap-2 w-full mt-0.5">
                       <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest bg-[#20201f] px-2 py-0.5 rounded-md border border-[#484847]/20 shrink-0">{catName}</span>
                       <span className="text-[#53ddfc] font-black tracking-tight text-sm px-1 truncate line-clamp-1 flex flex-col items-start leading-none gap-0.5">
                         {promoActive ? (
                           <>
                             <span className="text-[10px] text-[#ff716c] line-through font-normal">{formatCurrency(product.price)}</span>
                             <span className="flex items-center gap-1.5 align-middle">{formatCurrency(activePrice)} <span className="text-[8px] bg-[#53ddfc] text-[#004b58] px-1 py-[1px] rounded font-black tracking-widest uppercase mb-0.5">Promo</span></span>
                           </>
                         ) : (
                            formatCurrency(product.price)
                         )}
                       </span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-1.5 shrink-0 border-l border-[#484847]/20 pl-3 z-10 w-[100px]">
                   <div className="bg-[#20201f] text-white px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-inner border border-[#484847]/10 w-full mb-0.5 shrink-0">
                     <span className="font-black text-sm leading-none">{product.stock}</span>
                     <span className="text-[#adaaaa] text-[9px] font-black uppercase tracking-widest leading-none mt-0.5 truncate">est.</span>
                   </div>
                   
                   <div className="flex items-center justify-between w-full">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setPromoProduct(product);
                         setPromoPriceValue(product.promotionalPrice ? product.promotionalPrice.toString() : "");
                         setPromoDateValue(product.promotionEndDate ? new Date(product.promotionEndDate).toISOString().slice(0, 16) : "");
                       }}
                       className="text-[#adaaaa] p-1 hover:text-[#53ddfc] bg-[#20201f] rounded-lg transition-colors border border-transparent hover:border-[#53ddfc]/30 active:scale-95"
                       title="Promoções"
                     >
                       <Tag size={14} />
                     </button>
                     <button 
                       onClick={(e) => openEditModal(product, e)}
                       className="text-[#adaaaa] p-1 hover:text-[#06B6D4] bg-[#20201f] rounded-lg transition-colors border border-transparent hover:border-[#06B6D4]/30 active:scale-95"
                       title="Editar Dados e Categoria"
                     >
                       <Edit3 size={14} />
                     </button>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         handleDeleteProduct(product.id!, product.name);
                       }}
                       className="text-[#adaaaa] p-1 hover:text-[#ff716c] bg-[#20201f] rounded-lg transition-colors border border-transparent hover:border-[#ff716c]/30 active:scale-95"
                       title="Excluir Produto"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                 </div>
                 
                 {promoActive && <div className="absolute -inset-10 bg-gradient-to-l from-transparent via-[#53ddfc]/5 to-transparent pointer-events-none" />}
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
        onClick={handleCreateNew}
        className="fixed bottom-[96px] right-2/4 translate-x-[9rem] bg-[#06B6D4] text-[#004b58] p-4 rounded-full shadow-[0_8px_32px_rgba(6,182,212,0.4)] active:scale-90 hover:scale-105 transition-all z-30 flex items-center justify-center"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* Aba de Modal Sobreposta -> Criação / Edição Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-[#0e0e0e]/95 flex flex-col justify-end sm:items-center sm:justify-center backdrop-blur-xl p-0 sm:p-4 animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-[#121212] w-full max-w-md sm:rounded-2xl border-t sm:border border-[#484847]/50 shadow-2xl flex flex-col h-[95vh] sm:h-auto sm:max-h-[95vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#484847]/20 shrink-0">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                 {editingProduct ? <><Edit3 size={20} className="text-[#53ddfc]" /> Reparar Produto</> : <><Tag size={20} className="text-[#53ddfc]" /> Novo Produto</>}
              </h2>
              <button onClick={() => { setModalOpen(false); setEditingProduct(null); }} className="text-[#adaaaa] hover:text-[#ff716c] transition-colors p-2 rounded-full bg-[#20201f]">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col hide-scrollbar pb-32">
              {/* Reset key forces react-hook-form schema to reinitialize safely inside when switching editingProducts */}
              <ProductForm 
                key={editingProduct ? editingProduct.id : 'new'} 
                initialData={editingProduct || undefined}
                categories={categories} 
                onSubmit={handleSaveProduct} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Aba de Modal Rápida -> Ofertas (Tag) */}
      {promoProduct && (
        <div className="fixed inset-0 z-[60] bg-[#0e0e0e]/80 flex flex-col justify-end backdrop-blur-md p-0 pb-16 animate-in slide-in-from-bottom-full duration-200">
          <div className="bg-[#1a1a1a] w-full max-w-md mx-auto rounded-t-3xl border-t border-[#06B6D4]/30 shadow-[0_-10px_40px_rgba(6,182,212,0.1)] flex flex-col p-6 z-10 relative overflow-hidden">
             {/* Fundo glow do modal */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-[#06B6D4]/20 blur-[60px] rounded-t-full pointer-events-none" />

             <div className="flex justify-between items-center mb-6 relative z-10">
               <div className="flex items-center gap-3 text-white">
                 <div className="bg-[#20201f] p-2.5 rounded-full text-[#53ddfc] border border-[#06B6D4]/20 shadow-inner">
                   <PercentCircle size={22} />
                 </div>
                 <div className="flex flex-col">
                   <h2 className="text-lg font-black tracking-tight leading-none">Oferta Relâmpago</h2>
                   <span className="text-[#adaaaa] text-xs font-semibold uppercase tracking-widest mt-1 line-clamp-1">{promoProduct.name}</span>
                 </div>
               </div>
               <button onClick={() => setPromoProduct(null)} className="text-[#adaaaa] hover:text-[#ff716c] transition-colors p-2 rounded-full bg-[#20201f]">
                 <X size={20} />
               </button>
             </div>

             <div className="flex gap-4 relative z-10">
               <div className="flex-1 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-[#adaaaa]">Valor Promocional</label>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#53ddfc] text-sm">R$</span>
                   <input 
                     type="number"
                     step="0.01"
                     value={promoPriceValue}
                     onChange={(e) => setPromoPriceValue(e.target.value)}
                     className="w-full bg-[#121212] rounded-xl py-3 pl-9 pr-3 outline-none text-[#53ddfc] font-black border border-[#484847]/50 focus:border-[#06B6D4] shadow-inner"
                   />
                 </div>
               </div>
               
               <div className="flex-[1.2] flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-[#adaaaa]">Válido Até</label>
                 <input 
                   type="datetime-local"
                   value={promoDateValue}
                   onChange={(e) => setPromoDateValue(e.target.value)}
                   className="w-full bg-[#121212] rounded-xl py-3 px-3 outline-none text-white font-medium border border-[#484847]/50 focus:border-[#06B6D4] text-sm shadow-inner"
                 />
               </div>
             </div>

             <div className="flex gap-3 justify-between mt-6 relative z-10">
               {isPromotionActive(promoProduct) ? (
                  <button 
                     onClick={handleRemovePromo}
                     className="flex-1 bg-[#20201f] text-[#ff716c] font-black text-sm uppercase tracking-wider py-4 rounded-xl border border-[#484847]/50 active:scale-95 transition-all text-center"
                   >
                     Encerrar
                   </button>
               ) : (
                  <button 
                    onClick={() => setPromoProduct(null)}
                    className="flex-1 bg-[#20201f] text-[#adaaaa] font-black text-sm uppercase tracking-wider py-4 rounded-xl border border-[#484847]/50 active:scale-95 transition-all text-center hover:text-white"
                  >
                    Cancelar
                  </button>
               )}
               <button 
                 onClick={handleSavePromo}
                 className="flex-[1.5] bg-[#06B6D4] text-[#004b58] font-black text-sm uppercase tracking-wider py-4 rounded-xl shadow-[0_4px_24px_rgba(6,182,212,0.3)] hover:bg-[#53ddfc] active:scale-95 transition-all text-center"
               >
                 Ativar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Customizado de Exclusão (Substitui o window.confirm nativo viciado) */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-[70] bg-[#0e0e0e]/90 flex flex-col justify-center items-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl border border-[#ff716c]/30 shadow-[0_10px_40px_rgba(255,113,108,0.1)] flex flex-col p-6 items-center text-center relative overflow-hidden">
             
             <div className="bg-[#20201f] p-4 rounded-full text-[#ff716c] mb-4 shadow-inner border border-[#ff716c]/20">
               <Trash2 size={32} />
             </div>
             
             <h2 className="text-xl font-black text-white tracking-tight mb-2">Excluir Produto?</h2>
             <p className="text-[#adaaaa] text-sm leading-relaxed mb-6">
                Tem certeza que deseja apagar <br/>
                <strong className="text-white text-base">"{deleteCandidate.name}"</strong> <br/>do seu catálogo? Esta ação não pode ser desfeita.
             </p>

             <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteCandidate(null)}
                  className="flex-1 bg-[#20201f] text-[#adaaaa] font-bold text-sm uppercase tracking-wider py-4 rounded-xl border border-[#484847]/50 active:scale-95 transition-all text-center hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-[#ff716c] text-[#1a1a1a] font-black text-sm uppercase tracking-wider py-4 rounded-xl shadow-[0_4px_24px_rgba(255,113,108,0.3)] hover:bg-[#ff8682] active:scale-95 transition-all text-center"
                >
                  Excluir
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
