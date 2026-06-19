"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingBag, Plus, Minus, Store, ChevronRight, X, LayoutGrid, List, Tag } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { getEffectivePrice } from "@/lib/utils";

interface Product {
  local_id: number;
  name: string;
  price: string;
  stock: number;
  categoryid?: number;
  imageurl?: string;
  promotionalPrice?: string | number;
  promotionEndDate?: string;
  description?: string;
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Modo de exibição (grade ou lista) — espelha a tela do vendedor, preferência salva no aparelho do cliente
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  useEffect(() => {
    const saved = localStorage.getItem("nexo_catalogView");
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);
  const changeView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem("nexo_catalogView", mode);
  };

  // Nome da categoria e selo de disponibilidade para a tela de detalhe
  const categoryName = (id?: number) => categories.find(c => c.local_id === id)?.name;
  const stockBadge = (stock: number) => {
    if (stock <= 0) return { text: "Esgotado", cls: "bg-surface-raised text-muted" };
    if (stock <= 5) return { text: `Últimas ${stock} un.`, cls: "bg-danger/10 text-danger" };
    return { text: "Em estoque", cls: "bg-primary/10 text-primary" };
  };

  // Filtro
  const displayedProducts = products.filter(p => {
    const matchCat = activeCategory === null || p.categoryid === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Preço ativo via fonte única de verdade (mesma lógica do backend anti-spoofing)
  const calcActivePrice = (p: Product) => getEffectivePrice(p);

  const cartTotal = cart.reduce((acc, curr) => acc + (calcActivePrice(curr) * curr.quantity), 0);
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
       text += `${i.quantity}x ${i.name} - R$ ${(calcActivePrice(i)*i.quantity).toFixed(2)}\n`;
     });
     text += `\n*Total estimado: R$ ${cartTotal.toFixed(2)}*\n\n`;
     text += `Podemos prosseguir com o pagamento?`;
     return `https://wa.me/55${wppPhone}?text=${encodeURIComponent(text)}`;
  };

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerWpp, setCustomerWpp] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderDoneId, setOrderDoneId] = useState<string | null>(null);

  const handleFinishOrder = async () => {
     if(!customerName || !customerWpp) {
        toast.error("Preencha seu Nome e WhatsApp para prosseguirmos.");
        return;
     }

     setSendingOrder(true);
     try {
       // O SUPER MODO CLOUD!
       const storeId = window.location.pathname.split("/c/")[1];

       const payload = {
         storeId,
         customerName,
         customerPhone: customerWpp,
         paymentMethod,
         cartItems: cart.map(i => ({ productId: i.local_id, name: i.name, price: calcActivePrice(i), quantity: i.quantity })),
         total: cartTotal
       };

       const res = await fetch('/api/orders', {
         method: 'POST',
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify(payload)
       });

       if (!res.ok) throw new Error("Falha no servidor.");
       const data = await res.json();

       setOrderDoneId(data.orderId);
       setCart([]); // Esvazia o carrinho local do cliente
     } catch(e) {
       toast.error("Falha ao enviar pedido. Tente novamente.");
     } finally {
       setSendingOrder(false);
     }
  };

  const getPoszapLink = () => {
    const text = `🛍️ *Pedido #${orderDoneId || '000'} - Pagamento: ${paymentMethod}*\nOi, ${storeName}! Acabei de registrar meu pedido de R$ ${cartTotal.toFixed(2)} pelo aplicativo. Me avisa quando aprovar!`;
    return `https://wa.me/55${wppPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="bg-background min-h-screen text-foreground font-[Inter] relative pb-28">
      
      {/* HEADER DA LOJA */}
      <header className="pt-8 pb-4 px-6 sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-gradient-to-tr from-primary to-primary-bright rounded-full flex items-center justify-center text-background shadow-glow">
                 <Store size={24} strokeWidth={2.5} />
             </div>
             <div className="flex flex-col">
               <h1 className="text-2xl font-black text-foreground tracking-tighter">{storeName}</h1>
               <span className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                 Catálogo Online
               </span>
             </div>
           </div>

           <div className="relative">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
             <input 
               type="text" 
               placeholder="Buscar por produtos..."
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full bg-surface border border-border/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-foreground placeholder-muted focus:outline-none focus:border-primary-bright transition-colors"
             />
           </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto block px-4 mt-6">
         {/* TABS DE CATEGORIAS */}
         <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 pb-2">
           <button 
             onClick={() => setActiveCategory(null)}
             className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeCategory === null ? 'bg-primary-bright text-background shadow-sm' : 'bg-surface border border-border/30 text-muted'}`}
           >
             Tudo
           </button>
           {categories.map(c => (
             <button 
               key={c.local_id}
               onClick={() => setActiveCategory(c.local_id)}
               className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeCategory === c.local_id ? 'bg-primary-bright text-background shadow-sm' : 'bg-surface border border-border/30 text-muted'}`}
             >
               {c.name}
             </button>
           ))}
         </div>

         {/* ALTERNÂNCIA GRADE / LISTA */}
         {displayedProducts.length > 0 && (
           <div className="flex justify-end mb-4">
             <div className="inline-flex bg-surface-raised rounded-lg p-0.5 border border-border/40">
               <button onClick={() => changeView('grid')} aria-label="Ver em grade" className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}><LayoutGrid size={16} /></button>
               <button onClick={() => changeView('list')} aria-label="Ver em lista" className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}><List size={16} /></button>
             </div>
           </div>
         )}

         {/* PRODUTOS */}
         <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "flex flex-col gap-2.5"}>
           {displayedProducts.map(product => {
              const inCartItem = cart.find(i => i.local_id === product.local_id);
              const isEsgotado = product.stock <= 0;
              const hasPromo = calcActivePrice(product) < Number(product.price);

              if (viewMode === 'list') {
                return (
                  <div key={product.local_id} onClick={() => setSelectedProduct(product)} className={`bg-surface border border-border/30 rounded-2xl p-2.5 flex items-center gap-3 relative overflow-hidden transition-all hover:border-primary-bright/30 cursor-pointer ${isEsgotado ? 'opacity-60' : ''}`}>
                    <div className="w-16 h-16 bg-surface-raised rounded-xl flex items-center justify-center overflow-hidden border border-border/20 shrink-0 relative">
                      {product.imageurl ? (
                        <img src={product.imageurl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="text-muted" />
                      )}
                      {hasPromo && <div className="absolute top-0.5 left-0.5 bg-primary-bright text-primary-deep px-1 rounded text-[8px] font-bold uppercase tracking-wider">Promo</div>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-bold text-sm leading-tight line-clamp-1 block">{product.name}</span>
                      <div className="flex items-baseline gap-2 mt-0.5 font-black tracking-tight">
                        <span className="text-primary-bright text-base">R$ {calcActivePrice(product).toFixed(2).replace('.', ',')}</span>
                        {hasPromo && <span className="text-[11px] text-danger line-through font-medium">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>}
                      </div>
                      <span className={`text-[10px] font-bold ${isEsgotado ? 'text-danger' : 'text-muted'}`}>{isEsgotado ? 'Esgotado' : `${product.stock} em estoque`}</span>
                    </div>

                    {!isEsgotado && (
                      inCartItem ? (
                        <div className="flex items-center gap-2 bg-surface-raised rounded-full p-1 border border-border/30 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleUpdateQty(product.local_id, -1)} className="w-7 h-7 rounded-full bg-background text-foreground flex items-center justify-center active:scale-95"><Minus size={13} /></button>
                          <span className="text-foreground font-black w-4 text-center text-sm">{inCartItem.quantity}</span>
                          <button disabled={inCartItem.quantity >= product.stock} onClick={() => handleUpdateQty(product.local_id, 1)} className="w-7 h-7 rounded-full bg-primary text-background flex items-center justify-center active:scale-95 disabled:opacity-50"><Plus size={13} strokeWidth={3} /></button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); handleAddToCart(product); }} className="w-11 h-11 rounded-full bg-primary text-background flex items-center justify-center shrink-0 active:scale-90 transition-transform shadow-glow" aria-label={`Adicionar ${product.name} à sacola`}>
                          <Plus size={20} strokeWidth={2.5} />
                        </button>
                      )
                    )}
                  </div>
                );
              }

              return (
                <div key={product.local_id} onClick={() => setSelectedProduct(product)} className="bg-surface border border-border/30 rounded-2xl p-4 flex flex-col relative overflow-hidden transition-all hover:border-primary-bright/30 cursor-pointer">
                  <div className="w-full aspect-square bg-surface-raised rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-border/20 relative">
                     {product.imageurl ? (
                       <img src={product.imageurl} alt={product.name} className="w-full h-full object-cover" />
                     ) : (
                       <ShoppingBag size={24} className="text-surface-raised" />
                     )}

                     {!isEsgotado && inCartItem && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                          <div className="flex items-center gap-3 bg-background/90 border border-border/50 rounded-full p-1.5 shadow-xl" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleUpdateQty(product.local_id, -1)} className="w-8 h-8 rounded-full bg-surface-raised text-foreground flex items-center justify-center active:scale-95"><Minus size={14} /></button>
                            <span className="text-foreground font-black w-4 text-center">{inCartItem.quantity}</span>
                            <button disabled={inCartItem.quantity >= product.stock} onClick={() => handleUpdateQty(product.local_id, 1)} className="w-8 h-8 rounded-full bg-primary text-background flex items-center justify-center active:scale-95 disabled:opacity-50"><Plus size={14} strokeWidth={3} /></button>
                          </div>
                       </div>
                     )}
                  </div>

                  <div className="flex flex-col mt-auto">
                    <span className="text-foreground font-bold leading-tight mb-1 line-clamp-2">{product.name}</span>
                    <span className="text-primary-bright font-black text-lg">
                      {hasPromo ? (
                         <div className="flex flex-col mt-1">
                           <span className="text-[11px] text-danger line-through font-normal leading-none" style={{marginBottom: '-2px'}}>R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                           <span className="flex items-center gap-1.5 align-middle leading-none mt-1">R$ {calcActivePrice(product).toFixed(2).replace('.', ',')} <span className="text-[10px] bg-primary-bright text-primary-deep px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">Promo</span></span>
                         </div>
                      ) : (
                         <span className="mt-1 block">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                      )}
                    </span>
                  </div>

                  {!isEsgotado ? (
                     !inCartItem && (
                      <div className="absolute bottom-4 right-4 text-muted flex items-center text-[10px] uppercase font-bold tracking-wider">
                         Detalhes
                      </div>
                    )
                  ) : (
                    <div className="absolute top-4 right-4 bg-red-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest">
                       Esgotado
                    </div>
                  )}
                </div>
              )
           })}
         </div>

         {displayedProducts.length === 0 && (
           <div className="w-full py-12 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-surface-raised rounded-full mb-4 flex justify-center items-center"><Search size={24} className="text-border" /></div>
             <p className="text-foreground font-bold text-lg">Nada encontrado</p>
             <p className="text-muted text-sm mt-1">Tente pesquisar outro termo.</p>
           </div>
         )}
      </main>

      {/* MODAL DE DETALHES DO PRODUTO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedProduct(null)}>
           <div className="bg-background rounded-t-3xl flex flex-col border-t border-border/30 shadow-overlay animate-in slide-in-from-bottom-full duration-300 max-w-3xl mx-auto w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
             
             {/* Foto do produto (proporcional) */}
             <div className="relative w-full aspect-[4/3] max-h-[42vh] bg-surface-raised flex items-center justify-center shrink-0 overflow-hidden">
               <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm text-muted flex items-center justify-center hover:text-foreground active:scale-95 z-10 shadow-sm"><X size={20} /></button>
               {selectedProduct.imageurl ? (
                  <img src={selectedProduct.imageurl} alt={selectedProduct.name} className="w-full h-full object-cover" />
               ) : (
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <ShoppingBag size={48} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sem foto</span>
                  </div>
               )}
               {calcActivePrice(selectedProduct) < Number(selectedProduct.price) && (
                 <div className="absolute top-4 left-4 bg-primary-bright text-primary-deep px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow z-10">Promoção</div>
               )}
             </div>

             <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[45vh] hide-scrollbar border-t border-border/30">
               {/* Categoria + disponibilidade */}
               <div className="flex items-center gap-2 flex-wrap">
                 {categoryName(selectedProduct.categoryid) && (
                   <span className="inline-flex items-center gap-1.5 bg-surface-raised text-muted px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-border/20">
                     <Tag size={12} /> {categoryName(selectedProduct.categoryid)}
                   </span>
                 )}
                 <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest ${stockBadge(selectedProduct.stock).cls}`}>
                   {stockBadge(selectedProduct.stock).text}
                 </span>
               </div>

               <h2 className="text-foreground font-black text-2xl tracking-tight leading-tight">{selectedProduct.name}</h2>

               <div className="flex items-end gap-2 mt-[-6px]">
                 <span className="text-primary-bright font-black text-3xl">R$ {calcActivePrice(selectedProduct).toFixed(2).replace('.', ',')}</span>
                 {calcActivePrice(selectedProduct) < Number(selectedProduct.price) && (
                   <span className="text-sm text-danger line-through font-normal mb-1 pb-0.5">R$ {Number(selectedProduct.price).toFixed(2).replace('.', ',')}</span>
                 )}
               </div>

               {/* Detalhes do produto (descrição preenchida no cadastro) */}
               <div className="mt-2 pt-4 border-t border-border/30">
                 <span className="text-muted text-[10px] font-bold uppercase tracking-widest mb-2 block">Sobre o produto</span>
                 {selectedProduct.description ? (
                   <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
                 ) : (
                   <p className="text-muted text-sm leading-relaxed italic">O vendedor ainda não adicionou uma descrição para este produto. Fale com a loja para mais detalhes.</p>
                 )}
               </div>
             </div>

             <div className="p-6 bg-surface border-t border-border/50 pb-8 mt-auto shrink-0 z-20 shadow-overlay">
               {selectedProduct.stock > 0 ? (
                 cart.find(i => i.local_id === selectedProduct.local_id) ? (
                   <div className="flex items-center justify-between bg-surface-raised rounded-xl p-2.5 border border-border/30 shadow-inner">
                      <span className="text-muted ml-4 font-bold uppercase tracking-widest text-xs">Na Sacola:</span>
                      <div className="flex items-center gap-4 bg-background rounded-lg p-1.5">
                        <button onClick={() => handleUpdateQty(selectedProduct.local_id, -1)} className="w-10 h-10 rounded-lg bg-surface-raised text-foreground flex items-center justify-center active:scale-95"><Minus size={18} /></button>
                        <span className="text-foreground font-black w-6 text-center text-xl">{cart.find(i => i.local_id === selectedProduct.local_id)?.quantity}</span>
                        <button disabled={cart.find(i => i.local_id === selectedProduct.local_id)!.quantity >= selectedProduct.stock} onClick={() => handleUpdateQty(selectedProduct.local_id, 1)} className="w-10 h-10 rounded-lg bg-primary text-background flex items-center justify-center active:scale-95 disabled:opacity-50"><Plus size={18} strokeWidth={3} /></button>
                      </div>
                   </div>
                 ) : (
                   <button 
                     onClick={() => { handleAddToCart(selectedProduct); setSelectedProduct(null); toast.success("Adicionado à sacola!"); }}
                     className="w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black text-lg uppercase tracking-wide shadow-glow transition-transform active:scale-[0.98] bg-primary text-background"
                   >
                     <ShoppingBag size={22} />
                     Adicionar à Sacola
                   </button>
                 )
               ) : (
                 <button disabled className="w-full py-4 rounded-xl flex items-center justify-center font-black text-lg uppercase tracking-wide bg-surface-raised text-muted opacity-70">
                   Esgotado
                 </button>
               )}
             </div>

           </div>
        </div>
      )}

      {/* FLOAT CART BAR */}
      {cartItemsCount > 0 && !cartOpen && !checkoutModalOpen && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-3xl mx-auto pointer-events-none">
           <div className="pointer-events-auto bg-gradient-to-r from-primary to-primary-bright p-1 rounded-2xl shadow-glow">
              <button 
                onClick={() => setCartOpen(true)}
                className="w-full bg-background rounded-xl py-3 px-5 flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                 <div className="flex items-center gap-3">
                   <div className="relative">
                     <ShoppingBag size={20} className="text-foreground" />
                     <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary-bright rounded-full flex items-center justify-center text-background font-bold text-[10px]">
                       {cartItemsCount}
                     </div>
                   </div>
                   <span className="text-foreground font-black uppercase tracking-widest text-xs">Ver Sacola</span>
                 </div>
                 <div className="flex items-center gap-2 text-foreground font-black">
                   R$ {cartTotal.toFixed(2).replace('.',',')}
                   <ChevronRight size={18} className="text-primary-bright" />
                 </div>
              </button>
           </div>
        </div>
      )}

      {/* CART OVERLAY SLIDE UP */}
      {cartOpen && !checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-background rounded-t-3xl h-[85vh] flex flex-col border-t border-border/30 shadow-overlay animate-in slide-in-from-bottom-full duration-300 max-w-3xl mx-auto w-full relative">
              <div className="p-5 flex justify-between items-center border-b border-border/30">
                <h2 className="text-foreground font-black text-xl flex items-center gap-2 tracking-tight">
                  <ShoppingBag className="text-primary-bright" />
                  Sua Sacola
                </h2>
                <button onClick={() => setCartOpen(false)} className="w-10 h-10 rounded-full bg-surface-raised text-muted flex items-center justify-center hover:text-foreground active:scale-95"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                 {cart.map(item => (
                   <div key={item.local_id} className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-border/30">
                      <div className="flex items-center gap-3">
                         <div className="w-14 h-14 bg-surface-raised rounded-xl overflow-hidden shadow-inner">
                           {item.imageurl ? <img src={item.imageurl} className="w-full h-full object-cover" /> : null}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-foreground font-bold text-sm leading-tight line-clamp-1">{item.name}</span>
                           <span className="text-primary-bright font-black">R$ {calcActivePrice(item).toFixed(2).replace('.', ',')}</span>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Total R$ {(calcActivePrice(item)*item.quantity).toFixed(2).replace('.',',')}</span>
                        <div className="flex items-center gap-3 bg-surface-raised rounded-full p-1 border border-border/30">
                            <button onClick={() => handleUpdateQty(item.local_id, -1)} className="w-6 h-6 rounded-full bg-background text-foreground flex items-center justify-center active:scale-95"><Minus size={12} /></button>
                            <span className="text-foreground font-black w-3 text-center text-xs">{item.quantity}</span>
                            <button disabled={item.quantity >= item.stock} onClick={() => handleUpdateQty(item.local_id, 1)} className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center active:scale-95 disabled:opacity-50"><Plus size={12} strokeWidth={3} /></button>
                          </div>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="p-6 bg-surface border-t border-border/50 flex flex-col gap-4 pb-8 rounded-t-3xl">
                 <div className="flex justify-between items-center px-2">
                    <span className="text-muted font-bold uppercase tracking-widest text-sm">Total do Pedido</span>
                    <span className="text-foreground font-black text-2xl">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                 </div>
                 <button 
                   onClick={() => setCheckoutModalOpen(true)}
                   className="w-full py-4 rounded-xl flex items-center justify-center font-black text-lg uppercase tracking-wide shadow-glow transition-transform active:scale-[0.98] bg-primary text-background"
                 >
                   Prosseguir
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* FINAL CHECKOUT MODAL NOVO */}
      {checkoutModalOpen && !orderDoneId && (
         <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-background rounded-t-3xl p-6 flex flex-col border-t border-border/30 shadow-overlay animate-in slide-in-from-bottom max-w-3xl mx-auto w-full relative">
              
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h2 className="text-foreground font-black text-2xl tracking-tight leading-none">Dados Finais</h2>
                   <span className="text-primary uppercase tracking-widest text-xs font-bold mt-1">Passo Final</span>
                 </div>
                 <button onClick={() => setCheckoutModalOpen(false)} className="w-10 h-10 rounded-full bg-surface-raised text-muted hover:text-foreground"><X size={20} className="mx-auto" /></button>
              </div>

              <div className="flex flex-col gap-4 mb-6">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-muted font-bold text-xs uppercase tracking-widest pl-1">Seu Nome</label>
                   <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="João Silva" className="bg-surface border border-border/50 rounded-xl px-4 py-3.5 text-foreground" />
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <label className="text-muted font-bold text-xs uppercase tracking-widest pl-1">Seu WhatsApp</label>
                   <input type="tel" value={customerWpp} onChange={e => setCustomerWpp(e.target.value)} placeholder="(11) 99999-9999" className="bg-surface border border-border/50 rounded-xl px-4 py-3.5 text-foreground" />
                 </div>
                 
                 <div className="flex flex-col gap-1.5 mt-2">
                   <label className="text-muted font-bold text-xs uppercase tracking-widest pl-1">Forma de Pagamento</label>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPaymentMethod('PIX')} className={`py-4 rounded-xl border-2 font-black transition-all ${paymentMethod === 'PIX' ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 text-muted'}`}>PIX Rápido</button>
                      <button onClick={() => setPaymentMethod('MAQUININHA/DINHEIRO')} className={`py-4 rounded-xl border-2 font-black transition-all ${paymentMethod === 'MAQUININHA/DINHEIRO' ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 text-muted'}`}>Na Entrega</button>
                   </div>
                 </div>
              </div>

              <button 
                onClick={handleFinishOrder}
                disabled={sendingOrder}
                className="w-full py-4 rounded-xl bg-primary text-background font-black text-lg uppercase tracking-wide disabled:opacity-50 mt-auto"
              >
                {sendingOrder ? 'Fechando Conta...' : 'Efetuar Pedido (R$ ' + cartTotal.toFixed(2).replace('.',',') + ')'}
              </button>
           </div>
         </div>
      )}

      {/* CONGRATULATIONS SCREEN */}
      {orderDoneId && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
           <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
             <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-glow">
                <ShoppingBag size={32} className="text-background" />
             </div>
           </div>
           
           <h2 className="text-3xl font-black text-foreground text-center mb-2 tracking-tighter">Pedido Nº {orderDoneId} Recebido!</h2>
           <p className="text-muted text-center mb-8">Sua ordem foi disparada com sucesso para os painéis da loja <strong className="text-foreground">{storeName}</strong>.</p>

           <div className="flex flex-col gap-3 w-full max-w-sm">
             <a 
               href={getPoszapLink()}
               target="_blank"
               className="w-full bg-[#25D366] text-white py-4 rounded-xl flex items-center justify-center font-black uppercase tracking-wide gap-2 shadow-lg"
             >
               Avisar Vendedor no WhatsApp
             </a>
             <button 
               onClick={() => { setOrderDoneId(null); setCheckoutModalOpen(false); setCartOpen(false); }}
               className="w-full bg-surface text-foreground border border-border/50 py-4 rounded-xl font-bold uppercase tracking-widest text-xs"
             >
               Continuar Navegando
             </button>
           </div>
        </div>
      )}

      {/* Estilos essenciais */}
      <style>
        {`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>
    </div>
  );
}
