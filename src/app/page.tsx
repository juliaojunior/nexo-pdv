"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency } from "@/lib/utils";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Search, Menu, Plus } from "lucide-react";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  
  // Real time Queries
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  
  // Stores
  const { items: cartItems, addItem } = useCartStore();

  // Metrics
  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalValue = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const filteredProducts = activeCategory 
    ? products.filter(p => p.categoryId === activeCategory)
    : products;

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] flex flex-col relative w-full">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-30 bg-[#121212]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(83,221,252,0.08)]">
        <div className="flex justify-between items-center px-4 h-16 w-full max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Menu className="text-[#53ddfc]" />
            <h1 className="text-[#53ddfc] font-black tracking-tighter text-xl">Nexo PDV</h1>
          </div>
          <div className="flex items-center gap-4">
            <Search className="text-[#adaaaa]" />
            <div className="w-8 h-8 rounded-full bg-[#20201f] border border-[#484847] flex items-center justify-center overflow-hidden shadow-sm">
              <span className="font-bold text-[10px] tracking-widest text-[#53ddfc]">NX</span>
            </div>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="fixed top-16 w-full z-30 bg-[#121212]/95 backdrop-blur-md pt-2 pb-0 border-b border-[#484847]/30">
        <div className="flex overflow-x-auto whitespace-nowrap px-4 gap-6 scroll-smooth hide-scrollbar max-w-md mx-auto">
          <div className="flex flex-col items-center cursor-pointer" onClick={() => setActiveCategory(null)}>
            <span className={`font-bold text-sm py-2 transition-colors ${activeCategory === null ? 'text-[#53ddfc]' : 'text-[#adaaaa] hover:text-[#53ddfc]'}`}>Todos</span>
            <div className={`h-0.5 w-full rounded-full transition-colors ${activeCategory === null ? 'bg-[#53ddfc]' : 'bg-transparent'}`}></div>
          </div>
          {categories.map((cat) => (
            <div key={cat.id!} className="flex flex-col items-center cursor-pointer" onClick={() => setActiveCategory(cat.id!)}>
              <span className={`font-bold text-sm py-2 transition-colors ${activeCategory === cat.id ? 'text-[#53ddfc]' : 'text-[#adaaaa] hover:text-[#53ddfc]'}`}>{cat.name}</span>
              <div className={`h-0.5 w-full rounded-full transition-colors ${activeCategory === cat.id ? 'bg-[#53ddfc]' : 'bg-transparent'}`}></div>
            </div>
          ))}
        </div>
      </nav>

      {/* Main Content: Dynamic Product Grid */}
      <main className="pt-32 pb-24 px-4 overflow-y-auto relative flex-1 max-w-md mx-auto w-full">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 pb-20">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-[#1a1a1a] rounded-xl p-3 flex flex-col gap-3 active:scale-[0.98] transition-transform shadow-sm border border-[#484847]/20">
                
                {/* Fallback Image Box */}
                <div className="aspect-square w-full rounded-lg bg-[#20201f] overflow-hidden relative flex flex-col items-center justify-center border border-[#484847]/10 group">
                   <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest text-center px-2">
                     {categories.find(c => c.id === product.categoryId)?.name || "Produto"}
                   </span>
                   {/* Add To Cart FAB Layer */}
                   <button 
                     onClick={() => addItem(product, 1)}
                     className="absolute top-2 right-2 bg-[#121212]/80 backdrop-blur-md p-1.5 rounded-full active:scale-90 transition-all border border-[#484847]/50 hover:bg-[#004b58] group-hover:border-[#06B6D4]"
                   >
                    <Plus size={18} className="text-[#53ddfc]" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#0e0e0e]/80 rounded text-[9px] font-bold text-[#adaaaa]">
                    {product.stock} em est.
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight h-10 line-clamp-2">{product.name}</h3>
                  <p className="text-[#06B6D4] font-black text-lg mt-1 tracking-tight truncate">{formatCurrency(product.price)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-[#adaaaa] text-center border-2 border-dashed border-[#484847]/30 rounded-2xl p-6">
             <span className="text-4xl mb-4">🛒</span>
             <p className="font-bold text-white mb-2">Nenhum produto cadastrado</p>
             <p className="text-sm">Acesse a aba <strong>Produtos</strong> na navegação inferior para montar seu estoque.</p>
          </div>
        )}
      </main>

      {/* Cart Summary Overlay */}
      {cartTotalItems > 0 && (
        <section className="fixed bottom-24 left-0 w-full z-40 px-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="max-w-md mx-auto bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-2xl h-16 flex items-center justify-between px-5 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] border border-[#53ddfc]/20 hover:border-[#53ddfc]/40 transition-colors cursor-pointer"
               onClick={() => setCheckoutOpen(true)}
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-[#adaaaa] uppercase font-bold tracking-widest leading-none mb-1">
                Carrinho ({cartTotalItems})
              </span>
              <span className="text-white font-extrabold text-lg tracking-tight leading-none">
                {formatCurrency(cartTotalValue)}
              </span>
            </div>
            
            <div className="bg-[#06B6D4] text-[#004b58] font-black px-6 py-2.5 rounded-xl hover:bg-[#53ddfc] transition-colors flex items-center gap-2">
              <span className="text-sm">Finalizar</span>
            </div>
          </div>
        </section>
      )}

      {/* Modal Engine Invocation */}
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
}
