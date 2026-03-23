"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency, isPromotionActive, getEffectivePrice } from "@/lib/utils";
import { CheckoutModal } from "@/components/CheckoutModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { Menu, Plus, Camera, Search } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  
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

  // Scanner Fast Checkout Logic
  const handleScanBarcode = (rawCode: string) => {
    setScannerOpen(false); // Fecha o modal da câmera da Home temporariamente
    const code = rawCode.trim();
    // Garante que o comparador limpe espaços e suporte tipos mistos que possam estar no indexedDB
    const foundProduct = products.find(p => p.barcode && String(p.barcode).trim() === code);
    
    if (foundProduct) {
      if (foundProduct.stock > 0) {
        addItem(foundProduct, 1);
        toast.success(`1x ${foundProduct.name} adicionado ao carrinho!`);
      } else {
        toast.error(`Produto "${foundProduct.name}" está sem estoque (0 und).`);
      }
    } else {
      toast.error(`Produto [${code}] não encontrado.`);
    }
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] flex flex-col relative w-full pb-20">
      
      {/* TopAppBar com Scanner Rápido */}
      <header className="fixed top-0 w-full z-30 bg-[#121212]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(83,221,252,0.08)]">
        <div className="flex justify-between items-center px-4 h-16 w-full max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Menu className="text-[#53ddfc]" />
            <h1 className="text-[#53ddfc] font-black tracking-tighter text-xl">Nexo PDV</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setScannerOpen(true)}
              className="p-2 -mr-1 text-[#06B6D4] bg-[#20201f] border border-[#484847]/40 rounded-full active:scale-90 transition-transform shadow-[0_2px_12px_rgba(6,182,212,0.2)]"
            >
              <Camera size={18} strokeWidth={2.5} />
            </button>
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
          <div className="grid grid-cols-2 gap-4 pb-10">
            {filteredProducts.map(product => {
              const promoActive = isPromotionActive(product);
              const activePrice = getEffectivePrice(product);

              return (
              <div key={product.id} className="bg-[#1a1a1a] rounded-2xl p-2.5 flex flex-col gap-2 active:scale-[0.98] transition-transform shadow-sm border border-[#484847]/30 border-b-4 border-b-[#484847]/50 relative overflow-hidden group">
                
                {/* Visual Image Render Overlay com Proteção Textual (Gradientes) */}
                <div className="aspect-square w-full rounded-xl bg-[#20201f] overflow-hidden relative flex flex-col items-center justify-center border border-[#484847]/10 group z-10">
                   
                   {product.image ? (
                     <>
                        <img src={product.image} className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-300" alt={product.name} />
                        {/* Gradiente sútil nas bordas pra proteger botão e tag */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                     </>
                   ) : (
                     <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest text-center px-2 z-10 opacity-70">
                       {categories.find(c => c.id === product.categoryId)?.name || "Produto"}
                     </span>
                   )}

                   {/* Indicador Micro-Badge Promo Dentro Card */}
                   {promoActive && (
                     <div className="absolute top-2 left-2 bg-[#ff716c] text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow z-20">
                       Promo
                     </div>
                   )}

                   {/* Add To Cart FAB Layer */}
                   <button 
                     onClick={() => addItem({...product, price: activePrice}, 1)}
                     className="absolute top-2 right-2 bg-[#121212]/80 backdrop-blur-md p-1.5 rounded-full active:scale-90 transition-all border border-[#484847]/50 hover:bg-[#004b58] group-hover:border-[#06B6D4] z-20 shadow-md"
                   >
                    <Plus size={18} className="text-[#53ddfc]" />
                  </button>
                  <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold z-20 ${product.stock <= 5 ? 'bg-[#ff716c]/90 text-white' : 'bg-[#0e0e0e]/80 text-[#adaaaa]'}`}>
                    {product.stock} em est.
                  </div>
                </div>

                <div className="px-1 pb-1 z-10">
                  <h3 className="text-sm font-bold text-white leading-tight h-10 line-clamp-2 mt-1">{product.name}</h3>
                  <div className="flex flex-col mt-0.5 font-black text-lg tracking-tight truncate">
                    {promoActive ? (
                      <div>
                        <span className="text-[11px] text-[#ff716c] line-through font-medium block leading-none">{formatCurrency(product.price)}</span>
                        <span className="text-[#53ddfc]">{formatCurrency(activePrice)}</span>
                      </div>
                    ) : (
                      <span className="text-[#06B6D4]">{formatCurrency(product.price)}</span>
                    )}
                  </div>
                </div>

                {/* Efeito Glow Promocional Fundo */}
                {promoActive && <div className="absolute -inset-10 bg-gradient-to-tr from-[#ff716c]/5 to-[#53ddfc]/5 pointer-events-none" />}
              </div>
            )})}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-[#adaaaa] text-center border-2 border-dashed border-[#484847]/30 rounded-3xl p-6 shadow-sm">
             <div className="bg-[#20201f] p-4 rounded-full mb-4">
                <Search size={28} className="text-[#53ddfc]" />
             </div>
             <p className="font-bold text-white mb-2 text-lg">Catálogo em branco</p>
             <p className="text-sm">Abra a aba <strong>Produtos</strong> ali embaixo para adicionar mercadorias e começar a vender.</p>
          </div>
        )}
      </main>

      {/* Cart Summary Overlay */}
      {cartTotalItems > 0 && (
        <section className="fixed bottom-24 left-0 w-full z-40 px-4 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="bg-[#1a1a1a]/95 backdrop-blur-2xl rounded-2xl h-16 flex items-center justify-between px-5 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] border border-[#06B6D4]/30 hover:border-[#06B6D4]/60 transition-colors cursor-pointer"
                 onClick={() => setCheckoutOpen(true)}
            >
              <div className="flex flex-col relative top-0.5">
                <span className="text-[10px] text-[#adaaaa] uppercase font-bold tracking-widest leading-none mb-1">
                  Carrinho ({cartTotalItems})
                </span>
                <span className="text-white font-extrabold text-lg tracking-tight leading-none drop-shadow-sm">
                  {formatCurrency(cartTotalValue)}
                </span>
              </div>
              
              <div className="bg-[#06B6D4] text-[#004b58] font-black px-6 py-2.5 rounded-xl hover:bg-[#53ddfc] transition-colors flex items-center gap-2 active:scale-95 shadow-md">
                <span className="text-sm uppercase tracking-wide">Finalizar</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Visor Misto Modal (Vendas) */}
      {isScannerOpen && (
        <BarcodeScannerModal 
          onClose={() => setScannerOpen(false)}
          onDetected={handleScanBarcode}
        />
      )}

      {/* Modal Engine Invocation */}
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
}
