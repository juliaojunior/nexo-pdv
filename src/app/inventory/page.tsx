"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Product } from "@/db/db";
import { ChevronLeft, Search, Package, Plus, Minus, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type AdjustmentMode = 'add' | 'subtract' | 'overwrite';

export default function InventoryPage() {
  const router = useRouter();
  const allProducts = useLiveQuery(() => db.products.toArray()) || [];
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Modal states
  const [mode, setMode] = useState<AdjustmentMode>('add');
  const [quantityStr, setQuantityStr] = useState("");

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const openAdjustmentModal = (product: Product) => {
    setSelectedProduct(product);
    setMode('add');
    setQuantityStr("");
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedProduct.id) return;

    const qty = parseInt(quantityStr, 10);
    if (isNaN(qty) || qty < 0) {
      return toast.error("Por favor, informe uma quantia válida.");
    }

    let newStock = selectedProduct.stock;
    
    if (mode === 'add') {
      newStock += qty;
    } else if (mode === 'subtract') {
       if (qty > selectedProduct.stock) {
         return toast.error(`Ato negado. O estoque atual é apenas ${selectedProduct.stock}.`);
       }
       newStock -= qty;
    } else if (mode === 'overwrite') {
       newStock = qty;
    }

    try {
      await db.products.update(selectedProduct.id, {
        stock: newStock,
        updatedAt: new Date().toISOString()
      });
      toast.success("Estoque sincronizado ao balanço!");
      closeModal();
    } catch (err) {
      toast.error("Erro interno ao atualizar produto.");
      console.error(err);
    }
  };

  const handleQuickAddQty = (amount: number) => {
    const current = parseInt(quantityStr, 10) || 0;
    setQuantityStr(String(Math.max(0, current + amount)));
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] relative w-full pb-32">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#121212]/90 backdrop-blur-md border-b border-[#484847]/30 px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform bg-[#20201f] text-[#adaaaa] hover:text-[#53ddfc]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Estoque</h1>
        </div>
        
        {/* BUSCA */}
        <div className="mt-4 max-w-md mx-auto">
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#adaaaa] group-focus-within:text-[#53ddfc] transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar mercadoria por nome ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#484847]/50 focus:border-[#06B6D4] rounded-xl h-12 pl-12 pr-4 text-sm font-medium outline-none transition-all placeholder:text-[#484847] shadow-inner"
            />
          </div>
        </div>
      </header>

      {/* FEED (LIST) */}
      <main className="px-4 pt-6 max-w-md mx-auto">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
            <div className="w-20 h-20 rounded-full border border-dashed border-[#adaaaa]/50 flex items-center justify-center mb-4 text-[#adaaaa]">
              <Package size={32} />
            </div>
            <p className="font-bold text-lg text-white">Prateleira vazia</p>
            <p className="text-sm mt-1">Nenhum produto cadastrado bate com a pesquisa.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredProducts.map(product => {
              const isCritical = product.stock <= 5;
              
              return (
              <div 
                key={product.id}
                onClick={() => openAdjustmentModal(product)}
                className="bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl p-3 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform cursor-pointer hover:border-[#53ddfc]/30 group"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr flex-shrink-0 from-[#004b58] to-[#1a1a1a] border border-[#06B6D4]/20 flex items-center justify-center overflow-hidden relative">
                    {product.image ? (
                       <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                    ) : (
                       <Package size={20} className="text-[#53ddfc] opacity-60" />
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-white text-base tracking-tight truncate max-w-[180px]">{product.name}</span>
                    <span className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mt-0.5 max-w-full">
                       {formatCurrency(product.price)}
                    </span>
                  </div>
                </div>

                {/* Stock Battery Tag */}
                <div className={`flex flex-col items-end flex-shrink-0 pl-2`}>
                   <div className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-inner transition-colors ${
                       isCritical 
                         ? 'bg-[#ff716c]/10 border border-[#ff716c]/30 animate-pulse' 
                         : 'bg-[#20201f] border border-[#484847]/30'
                     }`}
                   >
                     <span className={`font-black text-lg leading-none ${isCritical ? 'text-[#ff716c]' : 'text-white'}`}>{product.stock}</span>
                     <span className={`text-[9px] uppercase tracking-widest leading-none mt-1 ${isCritical ? 'text-[#ff716c]/70' : 'text-[#adaaaa]'}`}>un</span>
                   </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </main>

      {/* BOTTOM SHEET MODAL (ADJUSTMENT) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
            onClick={closeModal}
          ></div>
          
          {/* Sheet */}
          <div className="relative w-full sm:max-w-md bg-[#131313] sm:rounded-3xl rounded-t-3xl border-t sm:border border-[#484847]/50 shadow-[0_-24px_48px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] sm:max-h-[90vh] h-auto animate-in slide-in-from-bottom-full duration-300 z-10 mx-auto">
            
            {/* Grabber */}
            <div className="w-full flex justify-center py-3 sm:hidden flex-shrink-0" onClick={closeModal}>
              <div className="w-12 h-1.5 bg-[#484847] rounded-full"></div>
            </div>

            <div className="px-5 pb-5 pt-1 flex flex-col items-center border-b border-[#484847]/30 flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr flex-shrink-0 from-[#004b58] to-[#121212] border border-[#06B6D4]/30 flex items-center justify-center overflow-hidden mb-3 shadow-[0_4px_16px_rgba(6,182,212,0.2)]">
                {selectedProduct.image ? (
                   <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
                ) : (
                   <Package size={24} className="text-[#53ddfc]" />
                )}
              </div>
              
              <h2 className="text-lg font-black text-white tracking-tight text-center truncate w-full px-4">
                {selectedProduct.name}
              </h2>
              <div className="bg-[#1a1a1a] px-4 py-1.5 mt-2 rounded-full border border-[#484847] flex items-center gap-2">
                 <span className="text-[#adaaaa] text-[11px] font-bold uppercase tracking-widest">Estoque Atual:</span>
                 <span className="text-[#53ddfc] text-base font-black">{selectedProduct.stock}</span>
              </div>
            </div>

            <form onSubmit={handleAdjust} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="px-5 py-6 overflow-y-auto flex-1 flex flex-col gap-6">
                
                {/* TABS (Switcher) */}
                <div className="bg-[#1a1a1a] rounded-xl p-1.5 flex shadow-inner border border-[#484847]/30 flex-shrink-0">
                  <button 
                    type="button" 
                    onClick={() => { setMode('add'); setQuantityStr(""); }}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${mode === 'add' ? 'bg-[#20201f] border border-[#484847] text-white shadow-sm' : 'text-[#adaaaa] hover:text-white'}`}
                  >
                     <Plus size={20} className={mode === 'add' ? 'text-[#06B6D4]' : ''} />
                     <span className="font-bold text-[10px] uppercase tracking-widest mt-1">Soma</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setMode('subtract'); setQuantityStr(""); }}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${mode === 'subtract' ? 'bg-[#20201f] border border-[#484847] text-white shadow-sm' : 'text-[#adaaaa] hover:text-white'}`}
                  >
                     <Minus size={20} className={mode === 'subtract' ? 'text-[#ff716c]' : ''} />
                     <span className="font-bold text-[10px] uppercase tracking-widest mt-1">Perda</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setMode('overwrite'); setQuantityStr(""); }}
                    className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${mode === 'overwrite' ? 'bg-[#20201f] border border-[#484847] text-white shadow-sm' : 'text-[#adaaaa] hover:text-white'}`}
                  >
                     <Edit2 size={18} className={mode === 'overwrite' ? 'text-white' : ''} />
                     <span className="font-bold text-[10px] uppercase tracking-widest mt-1">Exato</span>
                  </button>
                </div>

                {/* INPUT COUNTER */}
                <div className="flex flex-col items-center space-y-4">
                   
                   <div className="flex items-center gap-6">
                     <button type="button" onClick={() => handleQuickAddQty(-1)} className="w-14 h-14 bg-[#1a1a1a] border border-[#484847]/50 rounded-2xl flex items-center justify-center text-white active:scale-95 shadow-sm hover:border-[#53ddfc] transition-colors">
                        <Minus size={24} strokeWidth={3} />
                     </button>
                     
                     <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          step="1"
                          value={quantityStr}
                          onChange={(e) => setQuantityStr(e.target.value)}
                          placeholder="0"
                          className="w-24 h-16 bg-transparent border-b-2 border-[#484847] focus:border-[#53ddfc] text-center text-4xl font-black text-white tracking-tighter outline-none transition-colors"
                        />
                     </div>

                     <button type="button" onClick={() => handleQuickAddQty(1)} className="w-14 h-14 bg-[#1a1a1a] border border-[#484847]/50 rounded-2xl flex items-center justify-center text-white active:scale-95 shadow-sm hover:border-[#53ddfc] transition-colors">
                        <Plus size={24} strokeWidth={3} />
                     </button>
                   </div>

                   <p className="text-[#adaaaa] text-[11px] font-medium text-center px-2">
                     {mode === 'add' && "Qual a quantidade exata de entrada deste lote?"}
                     {mode === 'subtract' && "Quantas unidades sofreram dano ou perda?"}
                     {mode === 'overwrite' && "Qual contagem física da mercadoria real?"}
                   </p>
                </div>
              </div>

              {/* Action Buttons Pinned at the Bottom (with safe-area padding for mobile) */}
              <div className="px-5 pt-4 pb-8 sm:pb-6 border-t border-[#484847]/30 flex gap-3 bg-[#131313] mt-auto flex-shrink-0 z-20 shadow-[0_-12px_24px_rgba(0,0,0,0.4)]">
                 <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-[0.8] h-12 sm:h-14 bg-[#1a1a1a] border border-[#484847]/50 hover:bg-[#20201f] text-white font-bold text-sm sm:text-base rounded-xl flex items-center justify-center active:scale-95 transition-all outline-none"
                 >
                   Cancelar
                 </button>
                 <button 
                  type="submit"
                  disabled={!quantityStr || parseInt(quantityStr, 10) === 0}
                  className="flex-[1.2] h-12 sm:h-14 bg-gradient-to-tr from-[#06B6D4] to-[#53ddfc] text-[#004b58] font-black text-sm sm:text-base rounded-xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-50 disabled:from-[#484847] disabled:to-[#484847] disabled:text-[#adaaaa]"
                 >
                   Confirmar
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
