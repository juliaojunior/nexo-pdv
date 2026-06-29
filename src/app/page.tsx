"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { UserButton } from "@clerk/nextjs";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency, isPromotionActive, getEffectivePrice } from "@/lib/utils";
import { CheckoutModal } from "@/components/CheckoutModal";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { Plus, Camera, Search, RefreshCw, ChevronRight, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { OfflineBadge } from "@/components/OfflineBadge";

import { cachedFetcher as fetcher } from "@/lib/offline/cachedFetcher";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  
  // Custom Store Name
  const [storeName, setStoreName] = useState("Nexo PDV");

  useEffect(() => {
    const savedName = localStorage.getItem("nexo_storeName");
    if (savedName && savedName.trim() !== "") {
      setStoreName(savedName);
    }
  }, []);

  // Modo de exibição dos produtos (grade ou lista) com preferência salva
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  useEffect(() => {
    const saved = localStorage.getItem("nexo_viewMode");
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);
  const changeView = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem("nexo_viewMode", mode);
  };
  
  // Sale Flow state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [finishedSaleData, setFinishedSaleData] = useState<ReceiptData | null>(null);
  
  // ==== NUVEM: SWR SUBSTITUINDO DEXIE ====
  const { data: rawCategories } = useSWR("/api/categories", fetcher);
  const { data: rawDbProducts, isLoading, mutate: mutateProducts } = useSWR("/api/products", fetcher, { revalidateOnFocus: true });

  const categories = rawCategories || [];

  // Resumo de vendas de hoje (estilo Kyte) — lido do cache offline
  const { data: rawSales } = useSWR("/api/sales", fetcher);
  const todayMetrics = useMemo(() => {
    const sales = rawSales || [];
    const now = new Date();
    let total = 0, count = 0;
    for (const s of sales) {
      const d = new Date(s.date);
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        total += Number(s.total || 0);
        count += 1;
      }
    }
    return { total, count };
  }, [rawSales]);

  // Mapeamento idêntico ao do catálogo
  const products = (rawDbProducts || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    costPrice: p.cost_price != null ? Number(p.cost_price) : undefined,
    stock: p.stock,
    barcode: p.barcode,
    categoryId: p.category_id,
    image: p.image_url,
    promotionalPrice: p.promotional_price ? Number(p.promotional_price) : undefined,
    promotionEndDate: p.promotion_end_date
  }));
  
  // Stores
  const { items: cartItems, addItem } = useCartStore();

  // Metrics
  const cartTotalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalValue = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const filteredProducts = activeCategory 
    ? products.filter((p: any) => p.categoryId === activeCategory)
    : products;

  // Scanner Fast Checkout Logic
  const handleScanBarcode = (rawCode: string) => {
    setScannerOpen(false); // Fecha o modal da câmera da Home temporariamente
    const code = rawCode.trim();
    // Garante que o comparador limpe espaços
    const foundProduct = products.find((p: any) => p.barcode && String(p.barcode).trim() === code);
    
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
    <div className="bg-background min-h-screen text-foreground font-['Inter'] flex flex-col relative w-full pb-20">
      
      {/* TopAppBar com Scanner Rápido */}
      <header className="fixed top-0 w-full z-30 bg-background/80 backdrop-blur-xl shadow-glow">
        <div className="flex justify-between items-center px-4 h-16 w-full max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-primary-bright font-black tracking-tighter text-xl truncate max-w-[180px]">{storeName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <OfflineBadge />
            <button
              onClick={() => setScannerOpen(true)}
              className="p-2 -mr-1 text-primary bg-surface-raised border border-border/40 rounded-full active:scale-90 transition-transform shadow-glow"
            >
              <Camera size={18} strokeWidth={2.5} />
            </button>
            <div className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center overflow-hidden shadow-sm transition-transform active:scale-95">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-surface border border-border/50 py-2",
                    userPreviewMainIdentifier: "text-foreground font-bold",
                    userPreviewSecondaryIdentifier: "text-muted",
                    userButtonPopoverActionButton: "hover:bg-surface-raised text-foreground",
                    userButtonPopoverActionButtonText: "text-foreground",
                    userButtonPopoverFooter: "hidden"
                  }
                }} 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="fixed top-16 w-full z-30 bg-background/95 backdrop-blur-md pt-2 pb-0 border-b border-border/30">
        <div className="flex overflow-x-auto whitespace-nowrap px-4 gap-6 scroll-smooth hide-scrollbar max-w-md mx-auto">
          <div className="flex flex-col items-center cursor-pointer" onClick={() => setActiveCategory(null)}>
            <span className={`font-bold text-sm py-2 transition-colors ${activeCategory === null ? 'text-primary-bright' : 'text-muted hover:text-primary-bright'}`}>Todos</span>
            <div className={`h-0.5 w-full rounded-full transition-colors ${activeCategory === null ? 'bg-primary-bright' : 'bg-transparent'}`}></div>
          </div>
          {categories.map((cat: any) => (
            <div key={cat.id!} className="flex flex-col items-center cursor-pointer" onClick={() => setActiveCategory(cat.id!)}>
              <span className={`font-bold text-sm py-2 transition-colors ${activeCategory === cat.id ? 'text-primary-bright' : 'text-muted hover:text-primary-bright'}`}>{cat.name}</span>
              <div className={`h-0.5 w-full rounded-full transition-colors ${activeCategory === cat.id ? 'bg-primary-bright' : 'bg-transparent'}`}></div>
            </div>
          ))}
        </div>
      </nav>

      {/* Main Content: Dynamic Product Grid */}
      <main className="pt-32 pb-24 px-4 overflow-y-auto relative flex-1 max-w-md mx-auto w-full">
        {/* Resumo de vendas do dia */}
        <Link href="/reports" className="block mb-4">
          <div className="bg-surface rounded-2xl shadow-card px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-transform">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Vendas de hoje</span>
              <span className="text-primary font-black text-2xl tracking-tight leading-none">{formatCurrency(todayMetrics.total)}</span>
              <span className="text-muted text-xs font-semibold mt-1.5">
                {todayMetrics.count === 1 ? "1 venda concluída" : `${todayMetrics.count} vendas concluídas`}
              </span>
            </div>
            <ChevronRight size={20} className="text-muted shrink-0" />
          </div>
        </Link>

        {isLoading ? (
           <div className="flex flex-col items-center justify-center p-8 text-center mt-10 opacity-50">
               <div className="w-10 h-10 border-4 border-border border-t-primary animate-spin rounded-full mb-4"></div>
               <p className="font-bold text-foreground text-sm">Carregando produtos...</p>
           </div>
        ) : filteredProducts.length > 0 ? (
          <>
          {/* Alternância grade / lista */}
          <div className="flex justify-end mb-3">
            <div className="inline-flex bg-surface-raised rounded-lg p-0.5 border border-border/40">
              <button onClick={() => changeView('grid')} aria-label="Ver em grade" className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}><LayoutGrid size={16} /></button>
              <button onClick={() => changeView('list')} aria-label="Ver em lista" className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}><List size={16} /></button>
            </div>
          </div>
          <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4 pb-10" : "flex flex-col gap-2 pb-10"}>
            {filteredProducts.map((product: any) => {
              const promoActive = isPromotionActive(product);
              const activePrice = getEffectivePrice(product);

              if (viewMode === 'list') {
                return (
                  <div key={product.id} className="bg-surface rounded-2xl shadow-card p-2.5 flex items-center gap-3 active:scale-[0.99] transition-transform relative overflow-hidden">
                    <div className="w-14 h-14 rounded-xl bg-surface-raised overflow-hidden relative flex items-center justify-center shrink-0 border border-border/10">
                      {product.image ? (
                        <img src={product.image} className="absolute inset-0 w-full h-full object-cover" alt={product.name} />
                      ) : (
                        <span className="text-muted text-[8px] font-bold uppercase tracking-widest text-center px-1 opacity-70 leading-tight">{categories.find((c: any) => c.id === product.categoryId)?.name || "Produto"}</span>
                      )}
                      {promoActive && <div className="absolute top-0.5 left-0.5 bg-danger text-white px-1 rounded text-[8px] font-bold uppercase tracking-wider">Promo</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-1">{product.name}</h3>
                      <div className="flex items-baseline gap-2 mt-0.5 font-black tracking-tight">
                        {promoActive ? (
                          <>
                            <span className="text-primary-bright text-base">{formatCurrency(activePrice)}</span>
                            <span className="text-[11px] text-danger line-through font-medium">{formatCurrency(product.price)}</span>
                          </>
                        ) : (
                          <span className="text-primary text-base">{formatCurrency(product.price)}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${product.stock <= 5 ? 'text-danger' : 'text-muted'}`}>{product.stock} em estoque</span>
                    </div>
                    <button
                      onClick={() => addItem({ ...product, price: activePrice }, 1)}
                      className="w-11 h-11 rounded-full bg-primary text-primary-deep flex items-center justify-center shrink-0 active:scale-90 transition-transform shadow-glow"
                      aria-label={`Adicionar ${product.name} ao carrinho`}
                    >
                      <Plus size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              }

              return (
              <div key={product.id} className="bg-surface rounded-2xl p-2.5 flex flex-col gap-2 active:scale-[0.98] transition-transform shadow-card relative overflow-hidden group">
                
                {/* Visual Image Render Overlay com Proteção Textual (Gradientes) */}
                <div className="aspect-square w-full rounded-xl bg-surface-raised overflow-hidden relative flex flex-col items-center justify-center border border-border/10 group z-10">
                   
                   {product.image ? (
                     <>
                        <img src={product.image} className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-300" alt={product.name} />
                        {/* Gradiente sútil nas bordas pra proteger botão e tag */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                     </>
                   ) : (
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest text-center px-2 z-10 opacity-70">
                       {categories.find((c: any) => c.id === product.categoryId)?.name || "Produto"}
                     </span>
                   )}

                   {/* Indicador Micro-Badge Promo Dentro Card */}
                   {promoActive && (
                     <div className="absolute top-2 left-2 bg-danger text-white px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shadow z-20">
                       Promo
                     </div>
                   )}

                   {/* Add To Cart FAB Layer */}
                   <button 
                     onClick={() => addItem({...product, price: activePrice}, 1)}
                     className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-md w-11 h-11 flex items-center justify-center rounded-full active:scale-90 transition-all border border-border/50 hover:bg-primary-deep group-hover:border-primary z-20 shadow-md"
                     aria-label={`Adicionar ${product.name} ao carrinho`}
                   >
                    <Plus size={20} className="text-primary-bright" />
                  </button>
                  <div className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold z-20 ${product.stock <= 5 ? 'bg-danger/90 text-white' : 'bg-background/80 text-muted'}`}>
                    {product.stock} em est.
                  </div>
                </div>

                <div className="px-1 pb-1 z-10">
                  <h3 className="text-sm font-bold text-foreground leading-tight h-10 line-clamp-2 mt-1">{product.name}</h3>
                  <div className="flex flex-col mt-0.5 font-black text-lg tracking-tight truncate">
                    {promoActive ? (
                      <div>
                        <span className="text-[11px] text-danger line-through font-medium block leading-none">{formatCurrency(product.price)}</span>
                        <span className="text-primary-bright">{formatCurrency(activePrice)}</span>
                      </div>
                    ) : (
                      <span className="text-primary">{formatCurrency(product.price)}</span>
                    )}
                  </div>
                </div>

                {/* Efeito Glow Promocional Fundo */}
              </div>
            )})}
          </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-muted text-center border-2 border-dashed border-border/30 rounded-3xl p-6 shadow-sm">
             <div className="bg-surface-raised p-4 rounded-full mb-4">
                <Search size={28} className="text-primary-bright" />
             </div>
             <p className="font-bold text-foreground mb-2 text-lg">Nenhum produto ainda</p>
             <p className="text-sm mb-5">Seus produtos aparecerão aqui, prontos para vender.</p>
             <Link href="/products" className="bg-primary text-primary-deep font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform shadow-glow">
               Cadastrar primeiro produto
             </Link>
          </div>
        )}
      </main>

      {/* Cart Summary Overlay */}
      {cartTotalItems > 0 && (
        <section className="fixed bottom-24 left-0 w-full z-40 px-4 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="bg-surface/95 backdrop-blur-2xl rounded-2xl h-16 flex items-center justify-between px-5 shadow-overlay border border-primary/30 hover:border-primary/60 transition-colors cursor-pointer"
                 onClick={() => setCheckoutOpen(true)}
            >
              <div className="flex flex-col relative top-0.5">
                <span className="text-[10px] text-muted uppercase font-bold tracking-widest leading-none mb-1">
                  Carrinho ({cartTotalItems})
                </span>
                <span className="text-foreground font-extrabold text-lg tracking-tight leading-none drop-shadow-sm">
                  {formatCurrency(cartTotalValue)}
                </span>
              </div>
              
              <div className="bg-primary text-primary-deep font-black px-6 py-2.5 rounded-xl hover:bg-primary-bright transition-colors flex items-center gap-2 active:scale-95 shadow-md">
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
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setCheckoutOpen(false)} 
        onSuccess={(data) => {
          setCheckoutOpen(false);
          mutateProducts();
          // Play beep sound if enabled
          if (typeof window !== "undefined" && localStorage.getItem("nexo_checkoutSounds") !== "false") {
             const audio = new Audio("/sounds/success.mp3");
             audio.volume = 0.5;
             audio.play().catch(()=>null);
          }
          // Redirect to Receipt Modal if enabled
          if (typeof window !== "undefined" && localStorage.getItem("nexo_receiptAutoShow") !== "false") {
            setFinishedSaleData(data);
            setIsReceiptOpen(true);
          }
        }}
      />

      <ReceiptModal 
        isOpen={isReceiptOpen} 
        onClose={() => setIsReceiptOpen(false)} 
        receiptData={finishedSaleData} 
      />
    </div>
  );
}
