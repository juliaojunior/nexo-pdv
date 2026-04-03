"use client";

import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/db/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency } from "@/lib/utils";
import { X, Minus, Plus, Users, Search, CheckCircle2 } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

type PaymentMethod = 'Dinheiro' | 'PIX' | 'Crédito' | 'Débito' | 'Fiado';

export function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { items, updateQuantity, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dinheiro');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  
  // Estados do Cliente / Fiado
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{id?: number, name: string} | null>(null);

  // Consulta Viva de Clientes Local
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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

    try {
      const saleData = {
        total,
        paymentMethod,
        amountReceived: paymentMethod === 'Dinheiro' ? amountReceived : undefined,
        change: paymentMethod === 'Dinheiro' ? change : undefined,
        customerId: selectedCustomer?.id,
        date: new Date().toISOString(),
      };

      const saleItemsData = items.map(item => ({
        productId: item.id!,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.price * item.quantity,
      }));

      // Inicia e aguarda a transação atômica do Dexie.js
      await db.finalizeSale(saleData, saleItemsData);
      
      // Limpa Zustand store e Notifica a UI
      clearCart();
      toast.success(paymentMethod === 'Fiado' ? "Dívida adicionada à conta do Cliente!" : "Venda finalizada com sucesso!");
      
      const completedReceiptData = {
        items: saleItemsData,
        total,
        paymentMethod,
        amountReceived: saleData.amountReceived,
        change: saleData.change,
        date: saleData.date,
        customerName: selectedCustomer?.name
      };

      if (onSuccess) {
        onSuccess(completedReceiptData);
      } else {
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro inesperado ao finalizar a transação.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-[#121212] w-full max-w-md sm:rounded-2xl border-t sm:border border-[#484847]/50 shadow-2xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]">
        
        {/* Topo do Modal */}
        <div className="flex justify-between items-center p-5 border-b border-[#484847]/30">
          <h2 className="text-xl font-bold text-white tracking-tight">Finalizar Venda</h2>
          <button onClick={onClose} className="text-[#adaaaa] hover:text-[#ff716c] transition-colors p-1 rounded-full bg-[#20201f]">
            <X size={20} />
          </button>
        </div>

        {/* Corpo Funcional */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6 hide-scrollbar">
          
          {/* TOTAL Exibido */}
          <div className="flex flex-col items-center pt-2">
            <span className="text-[#adaaaa] text-sm font-bold uppercase tracking-widest">Total da Venda</span>
            <span className="text-[#06B6D4] font-black text-5xl tracking-tighter mt-1">{formatCurrency(total)}</span>
          </div>

          {/* Vinculação de Cliente / Fiado */}
          <div className="flex flex-col gap-2 relative z-50">
             <span className="text-[#adaaaa] text-sm font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users size={16}/> Cliente da Cartela {paymentMethod === 'Fiado' && <span className="text-[#ff716c]">*</span>}</span>
             
             {selectedCustomer ? (
                <div className="bg-[#004b58] border border-[#53ddfc]/50 text-[#53ddfc] p-3 rounded-xl flex justify-between items-center shadow-inner">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#53ddfc]" />
                    <span className="font-bold tracking-tight">{selectedCustomer.name}</span>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-1 hover:text-white transition-colors bg-[#06B6D4]/20 rounded-full">
                     <X size={16} />
                  </button>
                </div>
             ) : (
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adaaaa]"><Search size={18}/></span>
                 <input
                   type="text"
                   value={customerSearch}
                   onChange={(e) => setCustomerSearch(e.target.value)}
                   className="w-full bg-[#1a1a1a] border border-[#484847]/30 rounded-xl py-3 pl-10 pr-3 focus:border-[#06B6D4] outline-none text-white transition-all font-medium placeholder:text-[#adaaaa]/50"
                   placeholder="Buscar Maria, João..."
                 />
                 
                 {/* Dropdown Flutuante de Clientes Encontrados */}
                 {filteredCustomers.length > 0 && (
                   <div className="absolute top-[110%] left-0 right-0 bg-[#20201f] border border-[#484847]/50 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {filteredCustomers.map(customer => (
                         <button 
                           key={customer.id} 
                           onClick={() => {
                             setSelectedCustomer(customer);
                             setCustomerSearch('');
                           }}
                           className="text-left px-4 py-3 border-b border-[#484847]/20 text-white font-medium hover:bg-[#06B6D4]/10 hover:text-[#53ddfc] transition-colors flex flex-col"
                         >
                           {customer.name}
                           {customer.phone && <span className="text-[#adaaaa] text-xs px-1">{customer.phone}</span>}
                         </button>
                      ))}
                   </div>
                 )}
               </div>
             )}
          </div>

          {/* Formas de Pagamento (Chips) */}
          <div className="flex flex-col gap-2 relative z-0">
            <span className="text-[#adaaaa] text-sm font-bold uppercase tracking-widest mb-1">Pagamento / Condição</span>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {(['Dinheiro', 'PIX', 'Crédito', 'Débito', 'Fiado'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 rounded-xl font-bold transition-all border ${
                    paymentMethod === method
                      ? method === 'Fiado' 
                        ? "bg-[#ff716c]/20 text-[#ff716c] border-[#ff716c]" 
                        : "bg-[#004b58] text-[#53ddfc] border-[#53ddfc]"
                      : "bg-[#1a1a1a] text-[#adaaaa] border-[#484847]/30 hover:bg-[#20201f]"
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
                <label className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest pl-1">Valor Recebido</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adaaaa]">R$</span>
                  <input
                    type="number"
                    value={amountReceivedInput}
                    onChange={(e) => setAmountReceivedInput(e.target.value)}
                    className="w-full bg-[#20201f] border border-[#484847]/50 rounded-xl py-3 pl-10 pr-3 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4] outline-none text-white transition-all font-medium"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest pl-1">Troco</label>
                <div className="w-full bg-[#1a1a1a] border border-[#484847]/30 rounded-xl py-3 px-4 text-white font-medium opacity-80">
                  {formatCurrency(change)}
                </div>
              </div>
            </div>
          )}

           {/* Lista Menor do Carrinho */}
           <div className="flex flex-col gap-2 mt-4 opacity-50 relative z-0">
             <span className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mb-1">Resumo Rápido</span>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center px-1">
                <span className="text-white font-medium text-sm line-clamp-1">{item.quantity}x {item.name}</span>
                <span className="text-[#adaaaa] text-sm">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé CTA */}
        <div className="p-5 border-t border-[#484847]/30 bg-[#121212] z-0">
          <button
            onClick={handleFinalizeSale}
            className={`w-full font-black text-lg uppercase tracking-wider py-4 rounded-xl active:scale-[0.98] transition-transform ${
              paymentMethod === 'Fiado' 
               ? "bg-[#ff716c] hover:bg-[#ff8682] text-[#1a1a1a]" 
               : "bg-[#06B6D4] hover:bg-[#53ddfc] text-[#004b58]"
            }`}
          >
            {paymentMethod === 'Fiado' ? 'Anotar na Cartela' : 'Confirmar Venda'}
          </button>
        </div>
      </div>
    </div>
  );
}
