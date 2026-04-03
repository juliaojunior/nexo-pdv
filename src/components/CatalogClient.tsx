"use client";

import { useState } from "react";
import { Search, ShoppingBag, Plus, Minus, Store, ChevronRight, X } from "lucide-react";
import Image from "next/image";

interface Product {
  local_id: number;
  name: string;
  price: string;
  stock: number;
  categoryid?: number;
  imageurl?: string;
}

interface Category {
  local_id: number;
  name: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function CatalogClient({ 
  products, 
  categories, 
  settings 
}: { 
  products: Product[], 
  categories: Category[], 
  settings: Record<string, string> 
}) {
  const storeName = settings["nexo_storeName"] || "Nexo Store";
  const wppPhone = settings["nexo_storePhone"]?.replace(/\D/g, "") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Filtro
  const displayedProducts = products.filter(p => {
    const matchCat = activeCategory === null || p.categoryid === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartTotal = cart.reduce((acc, curr) => acc + (Number(curr.price) * curr.quantity), 0);
  const cartItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.local_id === product.local_id);
      if (existing) {
         if (existing.quantity >= product.stock) return prev; // Limit to stock
         return prev.map(i => i.local_id === product.local_id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQty = (local_id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.local_id === local_id) {
        const newQ = i.quantity + delta;
        return { ...i, quantity: Math.max(0, newQ) };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const buildWhatsappLink = () => {
     let text = `🛍️ *Novo Pedido - ${storeName}*\n\n`;
     cart.forEach(i => {
       text += `${i.quantity}x ${i.name} - R$ ${(Number(i.price)*i.quantity).toFixed(2)}\n`;
     });
     text += `\n*Total estimado: R$ ${cartTotal.toFixed(2)}*\n\n`;
     text += `Podemos prosseguir com o pagamento?`;
     return `https://wa.me/55${wppPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-[Inter] relative pb-28">
      
      {/* HEADER DA LOJA */}
      <header className="pt-8 pb-4 px-6 sticky top-0 z-20 bg-[#121212]/90 backdrop-blur-xl border-b border-[#484847]/30">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-gradient-to-tr from-[#06B6D4] to-[#53ddfc] rounded-full flex items-center justify-center text-[#121212] shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                 <Store size={24} strokeWidth={2.5} />
             </div>
             <div className="flex flex-col">
               <h1 className="text-2xl font-black text-white tracking-tighter">{storeName}</h1>
               <span className="text-[#06B6D4] text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
                 Catálogo Online
               </span>
             </div>
           </div>

           <div className="relative">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaaa]" />
             <input 
               type="text" 
               placeholder="Buscar por produtos..."
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full bg-[#1a1a1a] border border-[#484847]/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-white placeholder-[#adaaaa] focus:outline-none focus:border-[#53ddfc] transition-colors"
             />
           </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto block px-4 mt-6">
         {/* TABS DE CATEGORIAS */}
         <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 pb-2">
           <button 
             onClick={() => setActiveCategory(null)}
             className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeCategory === null ? 'bg-[#53ddfc] text-[#121212] shadow-sm' : 'bg-[#1a1a1a] border border-[#484847]/30 text-[#adaaaa]'}`}
           >
             Tudo
           </button>
           {categories.map(c => (
             <button 
               key={c.local_id}
               onClick={() => setActiveCategory(c.local_id)}
               className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeCategory === c.local_id ? 'bg-[#53ddfc] text-[#121212] shadow-sm' : 'bg-[#1a1a1a] border border-[#484847]/30 text-[#adaaaa]'}`}
             >
               {c.name}
             </button>
           ))}
         </div>

         {/* GRID DE PRODUTOS */}
         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
           {displayedProducts.map(product => {
              const inCartItem = cart.find(i => i.local_id === product.local_id);
              const isEsgotado = product.stock <= 0;

              return (
                <div key={product.local_id} className="bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl p-4 flex flex-col relative overflow-hidden transition-all hover:border-[#53ddfc]/30">
                  <div className="w-full aspect-square bg-[#20201f] rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-[#484847]/20 relative">
                     {product.imageurl ? (
                       <img src={product.imageurl} alt={product.name} className="w-full h-full object-cover" />
                     ) : (
                       <ShoppingBag size={24} className="text-[#3a3a3a]" />
                     )}

                     {!isEsgotado && inCartItem && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                          <div className="flex items-center gap-3 bg-[#121212]/90 border border-[#484847]/50 rounded-full p-1.5 shadow-xl">
                            <button onClick={() => handleUpdateQty(product.local_id, -1)} className="w-8 h-8 rounded-full bg-[#20201f] text-white flex items-center justify-center active:scale-95"><Minus size={14} /></button>
                            <span className="text-white font-black w-4 text-center">{inCartItem.quantity}</span>
                            <button disabled={inCartItem.quantity >= product.stock} onClick={() => handleUpdateQty(product.local_id, 1)} className="w-8 h-8 rounded-full bg-[#06B6D4] text-[#121212] flex items-center justify-center active:scale-95 disabled:opacity-50"><Plus size={14} strokeWidth={3} /></button>
                          </div>
                       </div>
                     )}
                  </div>

                  <div className="flex flex-col mt-auto">
                    <span className="text-white font-bold leading-tight mb-1 line-clamp-2">{product.name}</span>
                    <span className="text-[#53ddfc] font-black text-lg">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                  </div>

                  {!isEsgotado ? (
                     !inCartItem && (
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className="absolute bottom-4 right-4 w-9 h-9 bg-[#06B6D4] text-[#121212] rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-90 transition-transform"
                      >
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    )
                  ) : (
                    <div className="absolute top-4 right-4 bg-red-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">
                       Esgotado
                    </div>
                  )}
                </div>
              )
           })}
         </div>

         {displayedProducts.length === 0 && (
           <div className="w-full py-12 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-[#20201f] rounded-full mb-4 flex justify-center items-center"><Search size={24} className="text-[#484847]" /></div>
             <p className="text-white font-bold text-lg">Nada encontrado</p>
             <p className="text-[#adaaaa] text-sm mt-1">Tente pesquisar outro termo.</p>
           </div>
         )}
      </main>

      {/* FLOAT CART BAR */}
      {cartItemsCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-3xl mx-auto pointer-events-none">
           <div className="pointer-events-auto bg-gradient-to-r from-[#06B6D4] to-[#53ddfc] p-1 rounded-2xl shadow-[0_10px_30px_rgba(6,182,212,0.3)]">
              <button 
                onClick={() => setCartOpen(true)}
                className="w-full bg-[#121212] rounded-xl py-3 px-5 flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                 <div className="flex items-center gap-3">
                   <div className="relative">
                     <ShoppingBag size={20} className="text-white" />
                     <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#53ddfc] rounded-full flex items-center justify-center text-[#121212] font-black text-[10px]">
                       {cartItemsCount}
                     </div>
                   </div>
                   <span className="text-white font-black uppercase tracking-widest text-xs">Ver Sacola</span>
                 </div>
                 <div className="flex items-center gap-2 text-white font-black">
                   R$ {cartTotal.toFixed(2).replace('.',',')}
                   <ChevronRight size={18} className="text-[#53ddfc]" />
                 </div>
              </button>
           </div>
        </div>
      )}

      {/* CART OVERLAY SLIDE UP */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#121212] rounded-t-3xl h-[85vh] flex flex-col border-t border-[#484847]/30 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300 max-w-3xl mx-auto w-full relative">
              <div className="p-5 flex justify-between items-center border-b border-[#484847]/30">
                <h2 className="text-white font-black text-xl flex items-center gap-2 tracking-tight">
                  <ShoppingBag className="text-[#53ddfc]" />
                  Sua Sacola
                </h2>
                <button onClick={() => setCartOpen(false)} className="w-10 h-10 rounded-full bg-[#20201f] text-[#adaaaa] flex items-center justify-center hover:text-white active:scale-95"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                 {cart.map(item => (
                   <div key={item.local_id} className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-2xl border border-[#484847]/30">
                      <div className="flex items-center gap-3">
                         <div className="w-14 h-14 bg-[#20201f] rounded-xl overflow-hidden shadow-inner">
                           {item.imageurl ? <img src={item.imageurl} className="w-full h-full object-cover" /> : null}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-white font-bold text-sm leading-tight line-clamp-1">{item.name}</span>
                           <span className="text-[#53ddfc] font-black">R$ {Number(item.price).toFixed(2).replace('.', ',')}</span>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest">Total R$ {(Number(item.price)*item.quantity).toFixed(2).replace('.',',')}</span>
                        <div className="flex items-center gap-3 bg-[#20201f] rounded-full p-1 border border-[#484847]/30">
                            <button onClick={() => handleUpdateQty(item.local_id, -1)} className="w-6 h-6 rounded-full bg-[#121212] text-white flex items-center justify-center active:scale-95"><Minus size={12} /></button>
                            <span className="text-white font-black w-3 text-center text-xs">{item.quantity}</span>
                            <button disabled={item.quantity >= item.stock} onClick={() => handleUpdateQty(item.local_id, 1)} className="w-6 h-6 rounded-full bg-[#06B6D4] text-[#121212] flex items-center justify-center active:scale-95 disabled:opacity-50"><Plus size={12} strokeWidth={3} /></button>
                          </div>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="p-6 bg-[#1a1a1a] border-t border-[#484847]/50 flex flex-col gap-4 pb-8 rounded-t-3xl">
                 <div className="flex justify-between items-center px-2">
                    <span className="text-[#adaaaa] font-bold uppercase tracking-widest text-sm">Resumo ({cartItemsCount})</span>
                    <span className="text-white font-black text-2xl">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                 </div>
                 <a 
                   href={wppPhone ? buildWhatsappLink() : '#'}
                   target="_blank"
                   className={`w-full py-4 rounded-xl flex items-center justify-center font-black text-lg uppercase tracking-wide shadow-[0_5px_20px_rgba(6,182,212,0.3)] transition-transform active:scale-[0.98] ${wppPhone ? 'bg-[#06B6D4] text-[#121212]' : 'bg-[#484847] text-[#adaaaa] pointer-events-none'}`}
                 >
                   {wppPhone ? 'Enviar Pedido ao Vendedor' : 'Loja sem WhatsApp Cadastrado.'}
                 </a>
              </div>
           </div>
        </div>
      )}

      {/* Estilos essenciais */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
