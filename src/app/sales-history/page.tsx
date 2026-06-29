"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import useSWR from "swr";
import { db } from "@/db/db";
import { ChevronLeft, Receipt, Trash2, ArrowDownRight, Clock, AlertTriangle, Wallet, ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { requireOnline } from "@/lib/offline/onlineGuard";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SalesHistoryPage() {
  const router = useRouter();

  // NUVEM: Histórico e Extrato de Vendas
  const { data: rawSales, mutate, isLoading } = useSWR("/api/sales", fetcher, { revalidateOnFocus: true });
  const sales = rawSales || [];

  // Manteve-se o customer local pois o cadastro de clientes ainda não foi portado para a Nuvem
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  
  const [filterMode, setFilterMode] = useState<"all" | "fiado">("all");
  const filteredSales = sales.filter((s: any) => filterMode === 'all' || s.paymentMethod === 'Fiado');
  
  const [revertCandidate, setRevertCandidate] = useState<number | null>(null);

  // Caderneta (fiado): registro de pagamento + histórico expansível
  const [payingSale, setPayingSale] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleRegisterPayment = async () => {
    if (!requireOnline() || !payingSale) return;
    const amount = parseFloat(payAmount.replace(",", "."));
    if (!amount || amount <= 0) { toast.error("Informe um valor de pagamento válido."); return; }

    setSubmittingPay(true);
    const tsId = toast.loading("Registrando pagamento...");
    try {
      const res = await fetch(`/api/sales/${payingSale.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Meio-dia local evita o "dia-off" de UTC quando a data é só YYYY-MM-DD
        body: JSON.stringify({ amount, paidAt: payDate ? `${payDate}T12:00:00` : undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Falha ao registrar.");
      toast.success("Pagamento registrado!", { id: tsId });
      setPayingSale(null); setPayAmount(""); setPayDate("");
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Não foi possível registrar o pagamento.", { id: tsId });
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleDeletePayment = async (saleId: number, paymentId: number) => {
    if (!requireOnline()) return;
    const tsId = toast.loading("Estornando pagamento...");
    try {
      const res = await fetch(`/api/sales/${saleId}/payment?paymentId=${paymentId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || "Falha."); }
      toast.success("Pagamento estornado.", { id: tsId });
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao estornar pagamento.", { id: tsId });
    }
  };

  const handleRevertSale = async () => {
    if (!revertCandidate) return;
    const tsId = toast.loading("Estornando venda e devolvendo itens ao estoque...");

    try {
      mutate(sales.filter((s: any) => s.id !== revertCandidate), false);

      const res = await fetch(`/api/sales?id=${revertCandidate}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();

      toast.success("Venda estornada da Rede! Os itens retornaram ao estoque com sucesso.", { id: tsId });
      setRevertCandidate(null);
      mutate();
    } catch (e: any) {
      toast.error("Não foi possível estornar a venda.", { id: tsId });
      mutate();
    }
  };

  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter'] relative w-full pb-32">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30 px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform bg-surface-raised text-muted hover:text-primary-bright">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-primary-bright font-black tracking-tighter text-2xl">Histórico de Caixa</h1>
            <span className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"/> Histórico de vendas</span>
          </div>
          <Link
            href="/receivables"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-warning/15 text-warning border border-warning/30 text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform"
          >
            <Wallet size={14} /> A Receber
          </Link>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-md mx-auto flex flex-col gap-4">
         
         <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} /> Extrato
            </span>
            <div className="flex bg-surface rounded-lg border border-border/30 overflow-hidden">
               <button 
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors ${filterMode === 'all' ? 'bg-primary text-primary-deep' : 'text-muted hover:text-foreground'}`}
               >
                  Tudo
               </button>
               <button 
                  onClick={() => setFilterMode('fiado')}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors border-l border-border/30 ${filterMode === 'fiado' ? 'bg-warning text-surface' : 'text-muted hover:text-foreground'}`}
               >
                  Fiados
               </button>
            </div>
         </div>

         {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center mt-10 opacity-50">
                <div className="w-10 h-10 border-4 border-border border-t-primary animate-spin rounded-full mb-4"></div>
                <p className="font-bold text-foreground uppercase tracking-widest text-xs">Baixando Transações...</p>
            </div>
         ) : filteredSales.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-[40vh] text-muted text-center border-2 border-dashed border-border/30 rounded-3xl p-6 shadow-sm bg-surface">
              <div className="bg-surface-raised p-4 rounded-full mb-4 shadow-inner">
                 <Receipt size={28} className="text-border" />
              </div>
              <p className="font-bold text-foreground mb-2 text-lg tracking-tight">Nenhuma venda ainda</p>
              <p className="text-xs leading-relaxed max-w-[200px]">Suas vendas aparecerão aqui.</p>
           </div>
         ) : (
           filteredSales.map((sale: any) => {
              const itemsCount = sale.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0);
              // Lucro = líquido da linha − custo congelado × quantidade (custo travado na venda)
              const profit = sale.items.reduce(
                (acc: number, it: any) => acc + (Number(it.subtotal) - Number(it.unitCost || 0) * it.quantity),
                0
              );

              // Fiado: saldo = total − amount_paid; status derivado
              const isFiado = sale.paymentMethod === 'Fiado';
              const amountPaid = Number(sale.amountPaid || 0);
              const balance = Math.round((Number(sale.total) - amountPaid) * 100) / 100;
              const payments = sale.payments || [];
              const isPaid = isFiado && balance <= 0.001;
              const isPartial = isFiado && amountPaid > 0.001 && !isPaid;

              return (
                <div key={sale.id} className="bg-surface rounded-2xl flex flex-col shadow-card overflow-hidden active:scale-[0.98] transition-transform">
                  
                  {/* Topo do Recibo Item */}
                  <div className="flex justify-between items-center p-4 border-b border-border/30 bg-surface">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-primary-bright border border-primary/20 shadow-inner">
                         <Receipt size={18} />
                       </div>
                       <div className="flex flex-col">
                         <span className="text-foreground font-black text-lg leading-tight tracking-tight">{formatCurrency(Number(sale.total))}</span>
                         <span className="text-muted text-[10px] font-bold uppercase tracking-widest">
                           {sale.customerId ? customers.find(c => c.id === sale.customerId)?.name || 'Cliente Oculto' : new Date(sale.date).toLocaleString('pt-BR')}
                         </span>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {isFiado && (
                        isPaid ? (
                          <span className="bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-1">
                            Pago
                          </span>
                        ) : (
                          <span className="bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                            {isPartial ? 'Parcial' : 'A receber'} {formatCurrency(balance)}
                          </span>
                        )
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md mb-1 ${
                        sale.paymentMethod === 'PIX' ? 'bg-primary/10 text-primary border border-primary/30' :
                        sale.paymentMethod === 'Dinheiro' ? 'bg-success/10 text-success border border-success/30' :
                        sale.paymentMethod === 'Fiado' ? 'bg-warning/10 text-warning border border-warning/30' :
                        'bg-muted/10 text-muted border border-muted/30'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                      <span className="text-muted text-[10px] font-bold">{itemsCount} Vol.</span>
                    </div>
                  </div>

                  {/* Detalhes dos Itens vendidos */}
                  <div className="p-4 flex flex-col gap-2 bg-background/50">
                    {sale.items.map((item: any) => (
                       <div key={item.id} className="flex justify-between items-center">
                          <span className="text-muted text-xs font-semibold max-w-[200px] truncate">
                            {item.quantity}x {item.productName}
                            {Number(item.discount) > 0 && (
                              <span className="text-primary-bright font-bold ml-1">(−{formatCurrency(Number(item.discount))})</span>
                            )}
                          </span>
                          <span className="text-foreground text-xs font-medium">{formatCurrency(Number(item.subtotal))}</span>
                       </div>
                    ))}
                    {Number(sale.discountTotal) > 0 && (
                       <div className="flex justify-between items-center pt-2 mt-1 border-t border-dashed border-border/40">
                          <span className="text-primary-bright text-[10px] font-bold uppercase tracking-widest">Descontos</span>
                          <span className="text-primary-bright text-xs font-bold">− {formatCurrency(Number(sale.discountTotal))}</span>
                       </div>
                    )}
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-dashed border-border/40">
                       <span className="text-success text-[10px] font-bold uppercase tracking-widest">Lucro</span>
                       <span className="text-success text-xs font-black">{formatCurrency(profit)}</span>
                    </div>

                    {/* Caderneta (Fiado): saldo, histórico de parcelas e registro de pagamento */}
                    {isFiado && (
                      <div className="mt-2 pt-3 border-t border-dashed border-warning/30 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Pago</span>
                          <span className="text-foreground text-xs font-bold">{formatCurrency(amountPaid)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isPaid ? 'text-success' : 'text-warning'}`}>Saldo</span>
                          <span className={`text-xs font-black ${isPaid ? 'text-success' : 'text-warning'}`}>{formatCurrency(balance)}</span>
                        </div>

                        {payments.length > 0 && (
                          <button
                            onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                            className="flex items-center justify-center gap-1 text-muted text-[10px] font-bold uppercase tracking-widest py-1 hover:text-foreground transition-colors"
                          >
                            {payments.length} pagamento{payments.length > 1 ? 's' : ''}
                            <ChevronDown size={12} className={`transition-transform ${expandedId === sale.id ? 'rotate-180' : ''}`} />
                          </button>
                        )}

                        {expandedId === sale.id && payments.map((p: any) => (
                          <div key={p.id} className="flex justify-between items-center bg-surface-raised/60 rounded-lg px-3 py-2 border border-border/20">
                            <div className="flex flex-col">
                              <span className="text-foreground text-xs font-bold">{formatCurrency(Number(p.amount))}</span>
                              <span className="text-muted text-[10px] font-medium">{new Date(p.paidAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <button
                              onClick={() => handleDeletePayment(sale.id, p.id)}
                              className="text-muted hover:text-danger p-1 rounded-md hover:bg-danger/10 transition-colors"
                              title="Estornar este pagamento"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {!isPaid && (
                          <button
                            onClick={() => { setPayingSale(sale); setPayAmount(""); setPayDate(""); }}
                            className="flex items-center justify-center gap-1.5 mt-1 px-3 py-2 rounded-lg bg-warning/15 text-warning text-xs font-bold uppercase tracking-widest border border-warning/30 hover:bg-warning/25 transition-colors"
                          >
                            <Wallet size={14} /> Registrar pagamento
                          </button>
                        )}
                      </div>
                    )}

                    <div className="w-full flex justify-end mt-2 pt-3 border-t border-dashed border-border/50">
                       <button 
                         onClick={() => setRevertCandidate(sale.id!)}
                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised text-danger text-xs font-bold uppercase tracking-widest border border-danger/20 hover:bg-danger/10 transition-colors"
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
      {/* Modal: Registrar Pagamento (Fiado) */}
      {payingSale && (
        <div className="fixed inset-0 z-[100] bg-background/90 flex flex-col justify-end sm:justify-center sm:items-center backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl border-t sm:border border-warning/30 flex flex-col p-6 relative">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-surface-raised p-2.5 rounded-full text-warning border border-warning/20 shadow-inner">
                  <Wallet size={22} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-black tracking-tight leading-none">Registrar Pagamento</h2>
                  <span className="text-muted text-xs font-semibold uppercase tracking-widest mt-1">
                    Saldo: {formatCurrency(Math.round((Number(payingSale.total) - Number(payingSale.amountPaid || 0)) * 100) / 100)}
                  </span>
                </div>
              </div>
              <button onClick={() => setPayingSale(null)} className="text-muted hover:text-danger transition-colors p-2 rounded-full bg-surface-raised">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-muted">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-warning text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-background rounded-xl py-3 pl-9 pr-3 outline-none text-foreground font-black border border-border/50 focus:border-warning shadow-inner"
                  />
                </div>
              </div>
              <div className="flex-[1.2] flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-muted">Data (opcional)</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-background rounded-xl py-3 px-3 outline-none text-foreground font-medium border border-border/50 focus:border-warning text-sm shadow-inner"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setPayAmount(String(Math.round((Number(payingSale.total) - Number(payingSale.amountPaid || 0)) * 100) / 100)); }}
                className="flex-1 bg-surface-raised text-muted font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl border border-border/50 active:scale-95 transition-all hover:text-foreground"
              >
                Quitar tudo
              </button>
              <button
                onClick={handleRegisterPayment}
                disabled={submittingPay}
                className="flex-[1.5] bg-warning text-surface font-black text-sm uppercase tracking-wider py-3.5 rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {submittingPay ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {revertCandidate && (
        <div className="fixed inset-0 z-[100] bg-background/95 flex flex-col justify-center items-center backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-surface w-full max-w-sm rounded-3xl border border-danger/30 flex flex-col p-6 items-center text-center relative overflow-hidden">

             <div className="bg-surface-raised p-4 rounded-full text-danger mb-4 shadow-inner border border-danger/20 relative">
               <AlertTriangle size={32} />
               <div className="absolute top-0 right-0 w-3 h-3 bg-danger animate-ping rounded-full" />
             </div>
             
             <h2 className="text-xl font-black text-foreground tracking-tight mb-2">Atenção Risco Alto</h2>
             <p className="text-muted text-sm leading-relaxed mb-6">
                Você está prestes a <strong className="text-foreground">estornar esta venda</strong>.<br/><br/>
                O valor sairá dos relatórios e os produtos voltarão ao estoque.
             </p>

             <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setRevertCandidate(null)}
                  className="flex-1 bg-surface-raised text-muted font-bold text-sm uppercase tracking-wider py-4 rounded-xl border border-border/50 active:scale-95 transition-all text-center hover:text-foreground"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRevertSale}
                  className="flex-1 bg-danger text-surface font-black text-sm uppercase tracking-wider py-4 rounded-xl hover:bg-danger/90 active:scale-95 transition-all text-center"
                >
                  Estornar venda
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
