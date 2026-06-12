"use client";

import { useState } from "react";
import useSWR from "swr";
import { ProductForm } from "@/components/ProductForm";
import { Search, Plus, X, Trash2, Tag, PercentCircle, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, isPromotionActive, getEffectivePrice } from "@/lib/utils";
import { uploadImageToImgBB } from "@/lib/imgbb";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProductsPage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados do Modal
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [promoProduct, setPromoProduct] = useState<any>(null);
  const [promoPriceValue, setPromoPriceValue] = useState("");
  const [promoDateValue, setPromoDateValue] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<{id: number, name: string} | null>(null);
  
  // NUVEM: Buscando Categorias + Produtos simultaneamente usando SWR!
  const { data: rawCategories } = useSWR("/api/categories", fetcher);
  const { data: rawDbProducts, mutate, isLoading } = useSWR("/api/products", fetcher, { revalidateOnFocus: true });
  
  const categories = rawCategories || [];
  
  // Mapeamento: Transforma o padrão do Banco (snake_case) pro padrão do Frontend (camelCase)
  const mappedProducts = (rawDbProducts || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stock: p.stock,
    barcode: p.barcode,
    categoryId: p.category_id,
    image: p.image_url,
    promotionalPrice: p.promotional_price ? Number(p.promotional_price) : undefined,
    promotionEndDate: p.promotion_end_date,
    description: p.description
  }));

  // Lógica de Filtragem de Busca
  const products = mappedProducts.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const handleSaveProduct = async (data: any) => {
    try {
      let finalImageUrl = editingProduct ? editingProduct.image : data.image;

      // Se existir nova imagem local (não é URL definitiva ainda)
      if (data.image && data.image !== editingProduct?.image && data.image.startsWith("data:image")) {
         toast.info("Enviando foto...", { id: 'upload' });
         finalImageUrl = await uploadImageToImgBB(data.image);
         toast.success("Foto processada!", { id: 'upload' });
      }

      const payload = {
        id: editingProduct ? editingProduct.id : undefined,
        name: data.name,
        categoryId: data.categoryId,
        price: data.price,
        barcode: data.barcode,
        image: finalImageUrl,
        stock: data.stock,
        description: data.description,
      };

      if (editingProduct) {
        // Optimistic
        mutate(rawDbProducts?.map((p: any) => p.id === editingProduct.id ? { ...p, ...payload, image_url: finalImageUrl, category_id: data.categoryId } : p), false);
        
        await fetch('/api/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        toast.success("Produto atualizado!");
      } else {
        // Optimistic Create (Aparece instantaneamente com id imaginario ate voltar)
        mutate([...(rawDbProducts || []), { ...payload, id: Date.now(), image_url: finalImageUrl, category_id: data.categoryId }], false);

        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        toast.success("Produto cadastrado!");
      }

      mutate(); // Re-fetch final pra garantir segurança
      setModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error("Não foi possível salvar o produto. Verifique sua conexão.");
      mutate();
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
      mutate(rawDbProducts?.filter((p: any) => p.id !== deleteCandidate.id), false);
      const res = await fetch(`/api/products?id=${deleteCandidate.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();

      toast.success(`${deleteCandidate.name} foi excluído.`);
      setDeleteCandidate(null);
      mutate();
    } catch (error) {
      toast.error("Não foi possível excluir o produto.");
      mutate();
    }
  };

  const handleSavePromo = async () => {
    if (!promoProduct) return;
    if (!promoPriceValue || !promoDateValue) {
      toast.error("Preencha o valor promocional e a data limite corretamente.");
      return;
    }

    try {
      const payload = {
        id: promoProduct.id,
        promotionalPrice: parseFloat(promoPriceValue),
        promotionEndDate: new Date(promoDateValue).toISOString()
      };

      mutate(rawDbProducts?.map((p: any) => p.id === promoProduct.id ? { ...p, promotional_price: payload.promotionalPrice, promotion_end_date: payload.promotionEndDate } : p), false);

      await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      toast.success("Oferta ativada e disparada para todos!");
      setPromoProduct(null);
      mutate();
    } catch (e) {
      toast.error("Falha ao registrar oferta.");
      mutate();
    }
  };

  const handleRemovePromo = async () => {
    if (!promoProduct) return;
    try {
       mutate(rawDbProducts?.map((p: any) => p.id === promoProduct.id ? { ...p, promotional_price: null, promotion_end_date: null } : p), false);

       await fetch('/api/products', {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: promoProduct.id, promotionalPrice: null, promotionEndDate: null })
       });

      toast.success("Promoção encerrada. Preço original restaurado.");
      setPromoProduct(null);
      mutate();
    } catch (e) {
      toast.error("Erro ao tentar remover oferta.");
      mutate();
    }
  };

  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter'] px-4 py-8 pb-28 relative max-w-md mx-auto">
      <header className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
           <h1 className="text-primary-bright font-black tracking-tighter text-2xl">Catálogo</h1>
           <span className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"/> Catálogo da loja</span>
        </div>
      </header>

      {/* Buscar de Produtos */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <Search size={20} />
        </span>
        <input 
          type="text" 
          placeholder="Buscar produtos..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface-raised border border-border/40 rounded-xl py-3.5 pl-12 pr-4 outline-none text-white font-medium focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm shadow-background/50 placeholder:text-muted/50"
        />
      </div>

      {/* Lista Principal de Itens */}
      <div className="flex flex-col gap-3 pb-8">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center p-8 text-center mt-4 opacity-50">
               <div className="w-10 h-10 border-4 border-border border-t-primary animate-spin rounded-full mb-4"></div>
               <p className="font-bold text-white uppercase tracking-widest text-xs">Puxando Inventário...</p>
           </div>
        ) : products.length > 0 ? (
          products.map((product: any) => {
             const catName = categories.find((c: any) => c.id === product.categoryId)?.name || "Geral";
             const promoActive = isPromotionActive(product);
             const activePrice = getEffectivePrice(product);

             return (
               <div key={product.id} className="bg-surface p-3 rounded-2xl flex justify-between items-center border border-border/30 shadow-sm transition-transform hover:bg-surface-raised group relative overflow-hidden">
                 
                 <div className="flex items-center gap-3 flex-1 pr-2 z-10 min-w-0">
                   {/* Mini Thumbnail */}
                   <div className="w-14 h-14 rounded-xl bg-surface-raised border border-border/30 flex items-center justify-center overflow-hidden shrink-0 relative">
                     {product.image ? (
                       <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                     ) : (
                       <span className="font-bold text-[10px] text-muted tracking-widest uppercase">Foto</span>
                     )}
                   </div>
                   
                   <div className="flex flex-col gap-0.5 flex-1 justify-center min-w-0">
                     <span className="text-white font-bold leading-tight line-clamp-1 pr-2">{product.name}</span>
                     <div className="flex items-center gap-2 w-full mt-0.5">
                       <span className="text-muted text-[10px] font-bold uppercase tracking-widest bg-surface-raised px-2 py-0.5 rounded-md border border-border/20 shrink-0">{catName}</span>
                       <span className="text-primary-bright font-black tracking-tight text-sm px-1 truncate line-clamp-1 flex flex-col items-start leading-none gap-0.5">
                         {promoActive ? (
                           <>
                             <span className="text-[10px] text-danger line-through font-normal">{formatCurrency(product.price)}</span>
                             <span className="flex items-center gap-1.5 align-middle">{formatCurrency(activePrice)} <span className="text-[10px] bg-primary-bright text-primary-deep px-1 py-[1px] rounded font-bold tracking-widest uppercase mb-0.5">Promo</span></span>
                           </>
                         ) : (
                            formatCurrency(product.price)
                         )}
                       </span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-1.5 shrink-0 border-l border-border/20 pl-3 z-10 w-[100px]">
                   <div className="bg-surface-raised text-white px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-inner border border-border/10 w-full mb-0.5 shrink-0">
                     <span className="font-black text-sm leading-none">{product.stock}</span>
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5 truncate">est.</span>
                   </div>
                   
                   <div className="flex items-center justify-between w-full">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setPromoProduct(product);
                         setPromoPriceValue(product.promotionalPrice ? product.promotionalPrice.toString() : "");
                         setPromoDateValue(product.promotionEndDate ? new Date(product.promotionEndDate).toISOString().slice(0, 16) : "");
                       }}
                       className="text-muted p-1 hover:text-primary-bright bg-surface-raised rounded-lg transition-colors border border-transparent hover:border-primary-bright/30 active:scale-95"
                       title="Promoções"
                     >
                       <Tag size={14} />
                     </button>
                     <button 
                       onClick={(e) => openEditModal(product, e)}
                       className="text-muted p-1 hover:text-primary bg-surface-raised rounded-lg transition-colors border border-transparent hover:border-primary/30 active:scale-95"
                       title="Editar Dados e Categoria"
                     >
                       <Edit3 size={14} />
                     </button>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         handleDeleteProduct(product.id!, product.name);
                       }}
                       className="text-muted p-1 hover:text-danger bg-surface-raised rounded-lg transition-colors border border-transparent hover:border-danger/30 active:scale-95"
                       title="Excluir Produto"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                 </div>
                 
                 {promoActive && <div className="absolute -inset-10 bg-gradient-to-l from-transparent via-primary-bright/5 to-transparent pointer-events-none" />}
               </div>
             )
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-surface rounded-2xl border-2 border-dashed border-border/30 mt-4">
             <div className="bg-surface-raised p-4 rounded-full mb-4">
                <Search size={28} className="text-muted" />
             </div>
             <p className="font-bold text-white tracking-wide">
                Nenhum vínculo detectado.
             </p>
             <p className="text-muted text-sm mt-1 mb-4 leading-relaxed max-w-[250px]">
                Adicione seu primeiro produto para que seus clientes de imediato já tenham visão lá no catálogo.
             </p>
          </div>
        )}
      </div>

      {/* Componente FAB - Anchor Inferior */}
      <button 
        onClick={handleCreateNew}
        className="fixed bottom-[96px] right-2/4 translate-x-[9rem] bg-primary text-primary-deep p-4 rounded-full shadow-glow active:scale-90 hover:scale-105 transition-all z-30 flex items-center justify-center"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* Aba de Modal Sobreposta -> Criação / Edição Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-background/95 flex flex-col justify-end sm:items-center sm:justify-center backdrop-blur-xl p-0 sm:p-4 animate-in slide-in-from-bottom-full duration-300">
          <div className="bg-background w-full max-w-md sm:rounded-2xl border-t sm:border border-border/50 shadow-2xl flex flex-col h-[95vh] sm:h-auto sm:max-h-[95vh]">
            <div className="flex justify-between items-center p-6 border-b border-border/20 shrink-0">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                 {editingProduct ? <><Edit3 size={20} className="text-primary-bright" /> Editar Produto</> : <><Tag size={20} className="text-primary-bright" /> Novo Produto</>}
              </h2>
              <button onClick={() => { setModalOpen(false); setEditingProduct(null); }} className="text-muted hover:text-danger transition-colors p-2 rounded-full bg-surface-raised">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col hide-scrollbar pb-32">
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
        <div className="fixed inset-0 z-[60] bg-background/80 flex flex-col justify-end backdrop-blur-md p-0 pb-16 animate-in slide-in-from-bottom-full duration-200">
           {/* ... UI idêntica ao original ... */}
          <div className="bg-surface w-full max-w-md mx-auto rounded-t-3xl border-t border-primary/30 shadow-glow flex flex-col p-6 z-10 relative overflow-hidden">
             

             <div className="flex justify-between items-center mb-6 relative z-10">
               <div className="flex items-center gap-3 text-white">
                 <div className="bg-surface-raised p-2.5 rounded-full text-primary-bright border border-primary/20 shadow-inner">
                   <PercentCircle size={22} />
                 </div>
                 <div className="flex flex-col">
                   <h2 className="text-lg font-black tracking-tight leading-none">Oferta da Vitrine</h2>
                   <span className="text-muted text-xs font-semibold uppercase tracking-widest mt-1 line-clamp-1">{promoProduct.name}</span>
                 </div>
               </div>
               <button onClick={() => setPromoProduct(null)} className="text-muted hover:text-danger transition-colors p-2 rounded-full bg-surface-raised">
                 <X size={20} />
               </button>
             </div>

             <div className="flex gap-4 relative z-10">
               <div className="flex-1 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-muted">Valor Promocional</label>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-primary-bright text-sm">R$</span>
                   <input 
                     type="number"
                     step="0.01"
                     value={promoPriceValue}
                     onChange={(e) => setPromoPriceValue(e.target.value)}
                     className="w-full bg-background rounded-xl py-3 pl-9 pr-3 outline-none text-primary-bright font-black border border-border/50 focus:border-primary shadow-inner"
                   />
                 </div>
               </div>
               
               <div className="flex-[1.2] flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-muted">Válida Até</label>
                 <input 
                   type="datetime-local"
                   value={promoDateValue}
                   onChange={(e) => setPromoDateValue(e.target.value)}
                   className="w-full bg-background rounded-xl py-3 px-3 outline-none text-white font-medium border border-border/50 focus:border-primary text-sm shadow-inner"
                 />
               </div>
             </div>

             <div className="flex gap-3 justify-between mt-6 relative z-10">
               {isPromotionActive(promoProduct) ? (
                  <button 
                     onClick={handleRemovePromo}
                     className="flex-1 bg-surface-raised text-danger font-black text-sm uppercase tracking-wider py-4 rounded-xl border border-border/50 active:scale-95 transition-all text-center"
                   >
                     Encerrar
                   </button>
               ) : (
                  <button 
                    onClick={() => setPromoProduct(null)}
                    className="flex-1 bg-surface-raised text-muted font-black text-sm uppercase tracking-wider py-4 rounded-xl border border-border/50 active:scale-95 transition-all text-center hover:text-white"
                  >
                    Cancelar
                  </button>
               )}
               <button 
                 onClick={handleSavePromo}
                 className="flex-[1.5] bg-primary text-primary-deep font-black text-sm uppercase tracking-wider py-4 rounded-xl shadow-glow hover:bg-primary-bright active:scale-95 transition-all text-center"
               >
                 Ativar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Customizado de Exclusão */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-[70] bg-background/90 flex flex-col justify-center items-center backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-surface w-full max-w-sm rounded-3xl border border-danger/30 flex flex-col p-6 items-center text-center relative overflow-hidden">
             
             <div className="bg-surface-raised p-4 rounded-full text-danger mb-4 shadow-inner border border-danger/20">
               <Trash2 size={32} />
             </div>
             
             <h2 className="text-xl font-black text-white tracking-tight mb-2">Excluir Produto?</h2>
             <p className="text-muted text-sm leading-relaxed mb-6">
                Tem certeza que deseja apagar <br/>
                <strong className="text-white text-base">"{deleteCandidate.name}"</strong> <br/>? Ele sairá do catálogo público.
             </p>

             <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeleteCandidate(null)}
                  className="flex-1 bg-surface-raised text-muted font-bold text-sm uppercase tracking-wider py-4 rounded-xl border border-border/50 active:scale-95 transition-all text-center hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-danger text-surface font-black text-sm uppercase tracking-wider py-4 rounded-xl hover:bg-danger/90 active:scale-95 transition-all text-center"
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
