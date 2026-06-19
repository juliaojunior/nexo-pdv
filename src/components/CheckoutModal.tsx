"use client";

import { useState } from "react";
import { toast } from "sonner";
import { db, type SalePayload, type PaymentMethod, PAYMENT_METHODS } from "@/db/db";
import { useLiveQuery } from "dexie-react-hooks";
import { submitSale } from "@/lib/offline/submitSale";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency, lineDiscountToBRL, type DiscountMode } from "@/lib/utils";
import { X, Minus, Plus, Users, Search, CheckCircle2, Tag } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

export function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { items, updateQuantity, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dinheiro');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados do Cliente / Fiado
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{id?: number, name: string} | null>(null);

  // Desconto por item (decisão do momento da venda — estado local, reseta a cada venda).
  // Chave = item.id; guarda o modo (R$/%) e o valor digitado.
  const [discounts, setDiscounts] = useState<Record<number, { mode: DiscountMode; value: string }>>({});
  const [openDiscountId, setOpenDiscountId] = useState<number | null>(null);

  // Consulta Viva de Clientes Local
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  if (!isOpen) return null;

  // ----- Cálculo de desconto por linha (fonte única: lineDiscountToBRL) -----
  const lineGross = (item: { price: number; quantity: number }) => item.price * item.quantity;
  const lineDiscount = (item: { id?: number; price: number; quantity: number }) => {
    const d = item.id != null ? discounts[item.id] : undefined;
    if (!d) return 0;
    return lineDiscountToBRL(lineGross(item), d.mode, parseFloat(d.value.replace(',', '.')) || 0);
  };
  const lineNet = (item: { id?: number; price: number; quantity: number }) => lineGross(item) - lineDiscount(item);

  const setDiscount = (id: number, patch: Partial<{ mode: DiscountMode; value: string }>) =>
    setDiscounts((prev) => ({ ...prev, [id]: { mode: prev[id]?.mode ?? 'BRL', value: prev[id]?.value ?? '', ...patch } }));
  const clearDiscount = (id: number) =>
    setDiscounts((prev) => { const next = { ...prev }; delete next[id]; return next; });

  const total = items.reduce((sum, item) => sum + lineNet(item), 0);
  const discountTotal = items.reduce((sum, item) => sum + lineDiscount(item), 0);
  const amountReceived = parseFloat(amountReceivedInput.replace(',', '.')) || 0;
  const change = amountReceived > total ? amountReceived - total : 0;

  // Filtragem inteligente do AutoComplete de clientes

  const filteredCustomers = customerSearch.trim() === '' 
    ? [] 
    : customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch))).slice(0, 4);

  const handleFinalizeSale = async () => {
    if (items.length === 0) {
      toast.error("O carrinho está vazio!");
      return;
    }

    if (paymentMethod === 'Dinheiro' && amountReceived < total) {
      toast.error("O valor recebido é menor que o total da venda!");
      return;
    }

    if (paymentMethod === 'Fiado' && !selectedCustomer) {
      toast.error("Venda 'Fiado' exige um Cliente vinculado na Cartela!");
      return;
    }

    setIsSubmitting(true);
    const tsId = toast.loading("Registrando venda...");

    try {
      const saleData: SalePayload = {
        clientId: crypto.randomUUID(),
        total,
        paymentMethod,
        amountReceived: paymentMethod === 'Dinheiro' ? amountReceived : undefined,
        change: paymentMethod === 'Dinheiro' ? change : undefined,
        customerId: selectedCustomer?.id,
        date: new Date().toISOString(),
        discountTotal: discountTotal > 0 ? discountTotal : undefined,
        items: items.map(item => ({
          productId: item.id!,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,           // preço cheio unitário
          discount: lineDiscount(item),    // desconto da linha em R$
          subtotal: lineNet(item),         // líquido (cheio - desconto)
        }))
      };

      const result = await submitSale(saleData, selectedCustomer?.name);

      clearCart();
      setDiscounts({});
      setOpenDiscountId(null);
      if (result.status === 'queued') {
        toast.warning("Sem conexão. Venda salva no aparelho — será enviada automaticamente quando a internet voltar.", { id: tsId, duration: 6000 });
      } else {
        toast.success(paymentMethod === 'Fiado' ? "Dívida adicionada à conta do Cliente!" : "Venda registrada!", { id: tsId });
      }
      
      const completedReceiptData = {
        items: saleData.items,
        total,
        paymentMethod,
        amountReceived: saleData.amountReceived,
        change: saleData.change,
        date: saleData.date,
        discountTotal: discountTotal > 0 ? discountTotal : undefined,
        customerName: selectedCustomer?.name
      };

      if (onSuccess) {
        onSuccess(completedReceiptData);
      } else {
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro inesperado ao finalizar a transação.", { id: tsId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-background w-full max-w-md sm:rounded-2xl border-t sm:border border-border/50 shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]">
        
        {/* Topo do Modal */}
        <div className="flex justify-between items-center p-5 border-b border-border/30">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Finalizar Venda</h2>
          <button onClick={onClose} className="text-muted hover:text-danger transition-colors p-1 rounded-full bg-surface-raised">
            <X size={20} />
          </button>
        </div>

        {/* Corpo Funcional */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 hide-scrollbar">
          
          {/* TOTAL Exibido */}
          <div className="flex flex-col items-center pt-2">
            <span className="text-muted text-sm font-bold uppercase tracking-widest">Total da Venda</span>
            <span className="text-primary font-black text-5xl tracking-tighter mt-1">{formatCurrency(total)}</span>
          </div>

          {/* Vinculação de Cliente / Fiado */}
          <div className="flex flex-col gap-2 relative z-50">
             <span className="text-muted text-sm font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users size={16}/> Cliente da Cartela {paymentMethod === 'Fiado' && <span className="text-danger">*</span>}</span>
             
             {selectedCustomer ? (
                <div className="bg-primary-deep border border-primary-bright/50 text-primary-bright p-3 rounded-xl flex justify-between items-center shadow-inner">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-primary-bright" />
                    <span className="font-bold tracking-tight">{selectedCustomer.name}</span>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:text-foreground transition-colors bg-primary/20 rounded-full">
                     <X size={16} />
                  </button>
                </div>
             ) : (
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Search size={18}/></span>
                 <input
                   type="text"
                   value={customerSearch}
                   onChange={(e) => setCustomerSearch(e.target.value)}
                   className="w-full bg-surface border border-border/30 rounded-xl py-3 pl-10 pr-3 focus:border-primary outline-none text-foreground transition-all font-medium placeholder:text-muted/50"
                   placeholder="Buscar Maria, João..."
                 />
                 
                 {/* Dropdown Flutuante de Clientes Encontrados */}
                 {filteredCustomers.length > 0 && (
                   <div className="absolute top-[110%] left-0 right-0 bg-surface-raised border border-border/50 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {filteredCustomers.map(customer => (
                         <button 
                           key={customer.id} 
                           onClick={() => {
                             setSelectedCustomer(customer);
                             setCustomerSearch('');
                           }}
                           className="text-left px-4 py-3 border-b border-border/20 text-foreground font-medium hover:bg-primary/10 hover:text-primary-bright transition-colors flex flex-col"
                         >
                           {customer.name}
                           {customer.phone && <span className="text-muted text-xs px-1">{customer.phone}</span>}
                         </button>
                      ))}
                   </div>
                 )}
               </div>
             )}
          </div>

          {/* Formas de Pagamento (Chips) */}
          <div className="flex flex-col gap-2 relative z-0">
            <span className="text-muted text-sm font-bold uppercase tracking-widest mb-1">Pagamento / Condição</span>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 rounded-xl font-bold transition-all border ${
                    paymentMethod === method
                      ? method === 'Fiado' 
                        ? "bg-danger/20 text-danger border-danger" 
                        : "bg-primary-deep text-primary-bright border-primary-bright"
                      : "bg-surface text-muted border-border/30 hover:bg-surface-raised"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Campos Dinâmicos Dinheiro */}
          {paymentMethod === 'Dinheiro' && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted text-xs font-bold uppercase tracking-widest pl-1">Valor Recebido</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">R$</span>
                  <input
                    type="number"
                    value={amountReceivedInput}
                    onChange={(e) => setAmountReceivedInput(e.target.value)}
                    className="w-full bg-surface-raised border border-border/50 rounded-xl py-3 pl-10 pr-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground transition-all font-medium"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted text-xs font-bold uppercase tracking-widest pl-1">Troco</label>
                <div className="w-full bg-surface border border-border/30 rounded-xl py-3 px-4 text-foreground font-medium opacity-80">
                  {formatCurrency(change)}
                </div>
              </div>
            </div>
          )}

           {/* Lista Menor do Carrinho Editável */}
           <div className="flex flex-col gap-2 mt-4 relative z-0">
             <span className="text-muted text-xs font-bold uppercase tracking-widest mb-1">Itens do Pedido</span>
            {items.map((item) => {
              const disc = lineDiscount(item);
              const isOpen = openDiscountId === item.id;
              const dState = item.id != null ? discounts[item.id] : undefined;
              return (
              <div key={item.id} className="flex flex-col bg-surface p-2 rounded-xl border border-border/20 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium text-sm line-clamp-1 flex-1 px-2">{item.name}</span>

                  <div className="flex items-center gap-2">
                     {/* Botão de desconto da linha */}
                     <button
                       type="button"
                       onClick={() => setOpenDiscountId(isOpen ? null : item.id!)}
                       className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg border transition-colors ${
                         disc > 0
                           ? "bg-primary/15 text-primary-bright border-primary/40"
                           : "bg-surface-raised text-muted border-border/40 hover:text-foreground"
                       }`}
                       aria-label="Desconto do item"
                     >
                       <Tag size={14} strokeWidth={2.5} />
                     </button>

                     <div className="flex items-center bg-surface-raised rounded-lg border border-border/40 shadow-inner overflow-hidden">
                       <button type="button" onClick={() => updateQuantity(item.id!, item.quantity - 1)} className="min-w-11 min-h-11 flex items-center justify-center text-danger hover:bg-danger/10 active:opacity-50 transition-colors">
                         <Minus size={14} strokeWidth={3} />
                       </button>
                       <span className="text-foreground font-black w-6 text-center text-sm">{item.quantity}</span>
                       <button type="button" onClick={() => updateQuantity(item.id!, item.quantity + 1)} className="min-w-11 min-h-11 flex items-center justify-center text-primary-bright hover:bg-primary-bright/10 active:opacity-50 transition-colors border-l border-border/40">
                         <Plus size={14} strokeWidth={3} />
                       </button>
                     </div>
                     <span className="text-xs font-bold w-[64px] text-right flex flex-col items-end leading-tight">
                        {disc > 0 && <span className="text-muted/60 line-through text-[10px]">{formatCurrency(lineGross(item))}</span>}
                        <span className={disc > 0 ? "text-primary-bright" : "text-muted"}>{formatCurrency(lineNet(item))}</span>
                     </span>
                  </div>
                </div>

                {/* Editor de desconto (R$ ou %) */}
                {isOpen && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20 px-1 animate-in fade-in slide-in-from-top-1">
                    <div className="flex rounded-lg border border-border/40 overflow-hidden shrink-0">
                      {(['BRL', 'PCT'] as DiscountMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDiscount(item.id!, { mode: m })}
                          className={`px-3 py-2 text-xs font-black transition-colors ${
                            (dState?.mode ?? 'BRL') === m ? "bg-primary text-primary-deep" : "bg-surface-raised text-muted"
                          }`}
                        >
                          {m === 'BRL' ? 'R$' : '%'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={dState?.value ?? ''}
                      onChange={(e) => setDiscount(item.id!, { value: e.target.value })}
                      placeholder={(dState?.mode ?? 'BRL') === 'PCT' ? '% desconto' : 'R$ desconto'}
                      className="flex-1 bg-surface-raised border border-border/50 rounded-lg py-2 px-3 text-foreground text-sm outline-none focus:border-primary"
                    />
                    {disc > 0 && (
                      <button
                        type="button"
                        onClick={() => { clearDiscount(item.id!); setOpenDiscountId(null); }}
                        className="min-w-11 min-h-11 flex items-center justify-center text-danger bg-danger/10 rounded-lg border border-danger/30 shrink-0"
                        aria-label="Remover desconto"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}

            {/* Resumo de descontos */}
            {discountTotal > 0 && (
              <div className="flex justify-between items-center px-2 pt-1 text-xs font-bold">
                <span className="text-muted uppercase tracking-widest">Descontos</span>
                <span className="text-primary-bright">− {formatCurrency(discountTotal)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé CTA */}
        <div className="p-5 border-t border-border/30 bg-background z-0">
          <button
            onClick={handleFinalizeSale}
            disabled={isSubmitting}
            className={`w-full font-black text-lg uppercase tracking-wider py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none ${
              paymentMethod === 'Fiado'
               ? "bg-danger hover:bg-danger/90 text-surface"
               : "bg-primary hover:bg-primary-bright text-primary-deep"
            }`}
          >
            {isSubmitting
              ? 'Processando...'
              : paymentMethod === 'Fiado' ? 'Anotar na Cartela' : 'Confirmar Venda'}
          </button>
        </div>
      </div>
    </div>
  );
}
