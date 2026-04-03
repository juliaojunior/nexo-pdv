"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { ChevronLeft, Receipt, Trash2, ArrowDownRight, Clock, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function SalesHistoryPage() {
  const router = useRouter();

  const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().toArray()) || [];
  const saleItems = useLiveQuery(() => db.saleItems.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  
  const [filterMode, setFilterMode] = useState<"all" | "fiado">("all");
  const filteredSales = sales.filter(s => filterMode === 'all' || s.paymentMethod === 'Fiado');
  
  const [revertCandidate, setRevertCandidate] = useState<number | null>(null);

  const handleRevertSale = async () => {
    if (!revertCandidate) return;
    try {
      await db.revertSale(revertCandidate);
      toast.success("Venda estornada! Os itens retornaram ao estoque com sucesso.");
      setRevertCandidate(null);
    } catch (e: any) {
      toast.error("Houve uma falha ao tentar estornar esta venda.");
      console.error(e);
    }
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] relative w-full pb-32">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#121212]/90 backdrop-blur-md border-b border-[#484847]/30 px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform bg-[#20201f] text-[#adaaaa] hover:text-[#53ddfc]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Histórico de Caixa</h1>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-md mx-auto flex flex-col gap-4">
         
         <div className="flex items-center justify-between mb-2">
            <span className="text-[#adaaaa] text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} /> Extrato
            </span>
            <div className="flex bg-[#1a1a1a] rounded-lg border border-[#484847]/30 overflow-hidden">
               <button 
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors ${filterMode === 'all' ? 'bg-[#06B6D4] text-[#004b58]' : 'text-[#adaaaa] hover:text-white'}`}
               >
                  Tudo
               </button>
               <button 
                  onClick={() => setFilterMode('fiado')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors border-l border-[#484847]/30 ${filterMode === 'fiado' ? 'bg-[#ffcc00] text-[#1a1a1a]' : 'text-[#adaaaa] hover:text-white'}`}
               >
                  Fiados
               </button>
            </div>
         </div>

         {filteredSales.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-[40vh] text-[#adaaaa] text-center border-2 border-dashed border-[#484847]/30 rounded-3xl p-6 shadow-sm bg-[#1a1a1a]">
              <div className="bg-[#20201f] p-4 rounded-full mb-4 shadow-inner">
                 <Receipt size={28} className="text-[#484847]" />
              </div>
              <p className="font-bold text-white mb-2 text-lg tracking-tight">Vazio</p>
              <p className="text-xs leading-relaxed max-w-[200px]">Nenhum faturamento encontrado neste filtro até o momento.</p>
           </div>
         ) : (
           filteredSales.map(sale => {
              const relatedItems = saleItems.filter(item => item.saleId === sale.id);
              const itemsCount = relatedItems.reduce((acc, curr) => acc + curr.quantity, 0);

              return (
                <div key={sale.id} className="bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl flex flex-col shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
                  
                  {/* Topo do Recibo Item */}
                  <div className="flex justify-between items-center p-4 border-b border-[#484847]/30 bg-[#171716]">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-[#20201f] flex items-center justify-center text-[#53ddfc] border border-[#06B6D4]/20 shadow-inner">
                         <Receipt size={18} />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-white font-black text-lg leading-tight tracking-tight">{formatCurrency(sale.total)}</span>
                         <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest">
                           {sale.customerId ? customers.find(c => c.id === sale.customerId)?.name || 'Cliente Oculto' : new Date(sale.date).toLocaleString('pt-BR')}
                         </span>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mb-1 ${
                        sale.paymentMethod === 'PIX' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30' :
                        sale.paymentMethod === 'Dinheiro' ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30' :
                        sale.paymentMethod === 'Fiado' ? 'bg-[#ffcc00]/10 text-[#ffcc00] border border-[#ffcc00]/30' :
                        'bg-[#adaaaa]/10 text-[#adaaaa] border border-[#adaaaa]/30'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                      <span className="text-[#adaaaa] text-[10px] font-bold">{itemsCount} Vol.</span>
                    </div>
                  </div>

                  {/* Detalhes dos Itens vendidos */}
                  <div className="p-4 flex flex-col gap-2 bg-[#121212]/50">
                    {relatedItems.map(item => (
                       <div key={item.id} className="flex justify-between items-center">
                          <span className="text-[#adaaaa] text-xs font-semibold max-w-[200px] truncate">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="text-[#F3F4F6] text-xs font-medium">{formatCurrency(item.subtotal)}</span>
                       </div>
                    ))}
                    <div className="w-full flex justify-end mt-2 pt-3 border-t border-dashed border-[#484847]/50">
                       <button 
                         onClick={() => setRevertCandidate(sale.id!)}
                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20201f] text-[#ff716c] text-xs font-bold uppercase tracking-widest border border-[#ff716c]/20 hover:bg-[#ff716c]/10 transition-colors"
                       >
                          <ArrowDownRight size={14} />
                          Estornar
                       </button>
                    </div>
                  </div>
                </div>
              )
           })
         )}
      </main>

      {/* Modal de Confirmação de Estorno */}
      {revertCandidate && (
        <div className="fixed inset-0 z-[100] bg-[#0e0e0e]/95 flex flex-col justify-center items-center backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-[#1a1a1a] w-full max-w-sm rounded-3xl border border-[#ff716c]/30 shadow-[0_10px_50px_rgba(255,113,108,0.15)] flex flex-col p-6 items-center text-center relative overflow-hidden">
             
             <div className="bg-[#20201f] p-4 rounded-full text-[#ff716c] mb-4 shadow-inner border border-[#ff716c]/20 relative">
               <AlertTriangle size={32} />
               <div className="absolute top-0 right-0 w-3 h-3 bg-[#ff716c] animate-ping rounded-full" />
             </div>
             
             <h2 className="text-xl font-black text-white tracking-tight mb-2">Atenção Risco Alto</h2>
             <p className="text-[#adaaaa] text-sm leading-relaxed mb-6">
                Você está ordenando o sistema a revogar e <strong className="text-white">destruir esta venda</strong>.<br/><br/>
                Os valores sairão dos seus relatórios de lucro, e os produtos retornarão imediatamente para a "Aba Estoque".
             </p>

             <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setRevertCandidate(null)}
                  className="flex-1 bg-[#20201f] text-[#adaaaa] font-bold text-sm uppercase tracking-wider py-4 rounded-xl border border-[#484847]/50 active:scale-95 transition-all text-center hover:text-white"
                >
                  Manter Venda
                </button>
                <button 
                  onClick={handleRevertSale}
                  className="flex-1 bg-[#ff716c] text-[#1a1a1a] font-black text-sm uppercase tracking-wider py-4 rounded-xl shadow-[0_4px_24px_rgba(255,113,108,0.3)] hover:bg-[#ff8682] active:scale-95 transition-all text-center"
                >
                  Estornar
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
