"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { parseCatalogLink } from "@/lib/catalogSharing";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, ChevronLeft, Plus, Minus, Send, Phone, Compass } from "lucide-react";

function MenuContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ products: any[], categories: any[] } | null>(null);
  const [cart, setCart] = useState<{ product: any, quantity: number }[]>([]);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", address: "" });

  useEffect(() => {
    const rawData = searchParams.get("data");
    if (rawData) {
      const parsed = parseCatalogLink(rawData);
      if (parsed) {
         setData(parsed);
      }
    }
  }, [searchParams]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white px-6 text-center">
         <div className="flex flex-col gap-4 items-center opacity-50">
           <Compass size={64} className="animate-spin-slow" />
           <p className="font-bold tracking-widest uppercase">Carregando ofertas...</p>
         </div>
      </div>
    )
  }

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
         // Limit to stock
         if (existing.quantity >= product.stock) return prev;
         return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      if (product.stock > 0) {
         return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
         return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const getCartQuantity = (productId: number) => {
    return cart.find(c => c.product.id === productId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleSendOrder = () => {
    if (!customerInfo.name) {
       alert("Por favor, digite seu nome.");
       return;
    }

    let message = `*NOVO PEDIDO DIGITAL* 🛒\n\n`;
    message += `👤 *Cliente:* ${customerInfo.name}\n`;
    if (customerInfo.address) {
       message += `📍 *Mesa/Endereço:* ${customerInfo.address}\n`;
    }
    message += `\n*ITENS:*\n`;
    
    // We construct the payload arrays so the POS can auto-decrease stock -> Format: id:quantity
    const payloadItems = cart.map(item => `${item.product.id}:${item.quantity}`).join(",");

    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.product.name} (${formatCurrency(item.product.price * item.quantity)})\n`;
    });

    const baseUrl = window.location.origin;
    message += `\n*TOTAL: ${formatCurrency(cartTotal)}*`;
    message += `\n\n👉 *Lojista, para aprovar o pedido e abater do caixa, toque no link:*`;
    message += `\n${baseUrl}/process?order=${payloadItems}&customer=${encodeURIComponent(customerInfo.name)}`;

    // WhatsApp Universal Link (Usuario escolhe o contato)
    const waLink = `whatsapp://send?text=${encodeURIComponent(message)}`;
    window.location.href = waLink;
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-[Inter] pb-32">
       {/* MENU HEADER */}
       <header className="bg-[#1a1a1a] p-6 sticky top-0 z-40 border-b border-[#484847]/30 shadow-md">
         <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl flex items-center gap-2">
            <ShoppingBag size={24} />
            Faça o seu pedido
         </h1>
         <p className="text-[#adaaaa] text-xs font-semibold uppercase tracking-widest mt-1">Catálogo Online</p>
       </header>

       {/* CATALOGO */}
       <main className="p-4 flex flex-col gap-8">
          {data.categories.map(category => {
             const catProducts = data.products.filter(p => p.categoryId === category.id);
             if (catProducts.length === 0) return null;

             return (
               <div key={category.id} className="flex flex-col gap-4">
                 <h2 className="text-white font-black text-xl tracking-tight border-b border-[#484847]/40 pb-2">{category.name}</h2>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {catProducts.map(product => (
                      <div key={product.id} className="bg-[#1a1a1a] rounded-2xl p-2 border border-[#484847]/30 flex flex-col justify-between shadow-sm relative overflow-hidden">
                        
                        <div className="w-full aspect-square rounded-xl bg-[#20201f] border border-[#484847]/20 flex items-center justify-center overflow-hidden mb-2 relative">
                           {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                           ) : (
                              <span className="font-bold text-[10px] text-[#adaaaa] tracking-widest uppercase">Sem Foto</span>
                           )}
                           
                           {/* Sold Out Overlay */}
                           {product.stock <= 0 && (
                             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                               <span className="bg-[#ff716c] text-white text-[10px] font-black tracking-widest px-2 py-1 rounded-full uppercase -rotate-12 outline outline-4 outline-[#1a1a1a]">Esgotado</span>
                             </div>
                           )}
                        </div>
                        
                        <div className="flex flex-col flex-1">
                           <h3 className="text-white font-bold leading-tight text-sm line-clamp-2">{product.name}</h3>
                           <p className="text-[#53ddfc] font-black mt-1 text-sm">{formatCurrency(product.price)}</p>
                        </div>
                        
                        {/* Controls */}
                        {product.stock > 0 && (
                          <div className="mt-3 flex items-center justify-between bg-[#20201f] rounded-xl p-1 shadow-inner h-10 border border-[#000]">
                             {getCartQuantity(product.id) > 0 ? (
                               <>
                                 <button onClick={() => removeFromCart(product.id)} className="w-8 h-8 flex flex-shrink-0 items-center justify-center bg-[#1a1a1a] rounded-lg text-white hover:bg-[#ff716c] transition-colors"><Minus size={16} /></button>
                                 <span className="font-black text-sm">{getCartQuantity(product.id)}</span>
                                 <button 
                                   onClick={() => addToCart(product)} 
                                   className={`w-8 h-8 flex flex-shrink-0 items-center justify-center bg-[#1a1a1a] rounded-lg text-white transition-colors ${getCartQuantity(product.id) >= product.stock ? 'opacity-50' : 'hover:bg-[#06B6D4]'}`}
                                 >
                                   <Plus size={16} />
                                 </button>
                               </>
                             ) : (
                               <button onClick={() => addToCart(product)} className="w-full h-full flex items-center justify-center text-[#adaaaa] hover:text-[#06B6D4] font-bold text-xs uppercase tracking-wider transition-colors">
                                 Adicionar
                               </button>
                             )}
                          </div>
                        )}
                      </div>
                    ))}
                 </div>
               </div>
             )
          })}
       </main>

       {/* FLOATING CART SUMMARY */}
       {totalItems > 0 && !checkoutStep && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50">
            <button onClick={() => setCheckoutStep(true)} className="bg-[#06B6D4] text-[#004b58] w-full p-4 rounded-2xl font-black text-lg shadow-[0_8px_32px_rgba(6,182,212,0.4)] flex justify-between items-center active:scale-95 transition-all">
               <div className="flex items-center gap-2">
                 <div className="bg-[#004b58] text-[#06B6D4] w-8 h-8 rounded-full flex items-center justify-center text-sm">{totalItems}</div>
                 <span>Ver Pedido</span>
               </div>
               <span>{formatCurrency(cartTotal)}</span>
            </button>
         </div>
       )}

       {/* CHECKOUT MODAL */}
       {checkoutStep && (
         <div className="fixed inset-0 z-50 bg-[#0e0e0e]/95 backdrop-blur-md flex flex-col animate-in slide-in-from-bottom-full duration-300">
           <header className="p-6 border-b border-[#484847]/30 flex items-center gap-4 bg-[#1a1a1a]">
             <button onClick={() => setCheckoutStep(false)} className="bg-[#20201f] text-white p-2 rounded-full"><ChevronLeft size={24} /></button>
             <h2 className="text-[#53ddfc] font-black tracking-tighter text-xl">Confirmar Pedido</h2>
           </header>
           
           <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                 <h3 className="font-bold text-[#adaaaa] uppercase tracking-widest text-xs">Itens do Carrinho ({totalItems})</h3>
                 {cart.map(item => (
                   <div key={item.product.id} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#484847]/30">
                     <div className="flex flex-col">
                       <span className="font-bold text-white leading-tight">{item.quantity}x {item.product.name}</span>
                       <span className="text-xs text-[#adaaaa]">{formatCurrency(item.product.price)} cada</span>
                     </div>
                     <span className="font-black text-[#53ddfc]">{formatCurrency(item.product.price * item.quantity)}</span>
                   </div>
                 ))}
                 <div className="flex justify-between items-center mt-2 px-1">
                   <span className="font-black text-xl text-white">Total</span>
                   <span className="font-black text-xl text-[#06B6D4]">{formatCurrency(cartTotal)}</span>
                 </div>
              </div>

              <div className="h-px w-full bg-[#484847]/30" />

              <div className="flex flex-col gap-4">
                 <h3 className="font-bold text-[#adaaaa] uppercase tracking-widest text-xs">Dados para Entrega</h3>
                 
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-bold uppercase tracking-widest pl-1 text-[#adaaaa]">Seu Nome</label>
                   <input 
                     value={customerInfo.name}
                     onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                     placeholder="Como devemos lhe chamar?"
                     className="w-full bg-[#20201f] rounded-xl py-3.5 px-4 outline-none text-white font-medium border border-[#484847]/50 focus:border-[#06B6D4]"
                   />
                 </div>
                 
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-bold uppercase tracking-widest pl-1 text-[#adaaaa]">Mesa ou Endereço (Opcional)</label>
                   <input 
                     value={customerInfo.address}
                     onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                     placeholder="Ex: Mesa 04, Rua das Flores..."
                     className="w-full bg-[#20201f] rounded-xl py-3.5 px-4 outline-none text-white font-medium border border-[#484847]/50 focus:border-[#06B6D4]"
                   />
                 </div>
              </div>
           </div>

           <div className="p-6 bg-[#1a1a1a] border-t border-[#484847]/30">
              <button 
                onClick={handleSendOrder}
                className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-black p-4 rounded-xl font-black text-lg uppercase tracking-wider shadow-[0_8px_32px_rgba(37,211,102,0.3)] flex justify-center items-center gap-3 active:scale-95 transition-all"
              >
                 <Send size={24} />
                 Enviar pelo WhatsApp
              </button>
           </div>
         </div>
       )}
    </div>
  )
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}>
      <MenuContent />
    </Suspense>
  )
}
