"use client";

import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/db/db";
import { useCartStore } from "@/stores/cart.store";
import { formatCurrency } from "@/lib/utils";
import { X, Minus, Plus } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

type PaymentMethod = 'Dinheiro' | 'PIX' | 'Crédito' | 'Débito';

export function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { items, updateQuantity, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Dinheiro');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');

  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const amountReceived = parseFloat(amountReceivedInput.replace(',', '.')) || 0;
  const change = amountReceived > total ? amountReceived - total : 0;

  const handleFinalizeSale = async () => {
    if (items.length === 0) {
      toast.error("O carrinho está vazio!");
      return;
    }

    if (paymentMethod === 'Dinheiro' && amountReceived < total) {
      toast.error("O valor recebido é menor que o total da venda!");
      return;
    }

    try {
      const saleData = {
        total,
        paymentMethod,
        amountReceived: paymentMethod === 'Dinheiro' ? amountReceived : undefined,
        change: paymentMethod === 'Dinheiro' ? change : undefined,
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
      toast.success("Venda finalizada com sucesso!");
      
      const completedReceiptData = {
        items: saleItemsData,
        total,
        paymentMethod,
        amountReceived: saleData.amountReceived,
        change: saleData.change,
        date: saleData.date
      };

      if (onSuccess) {
        onSuccess(completedReceiptData);
      } else {
        onClose();
      }
    } catch (error: any) {
      // Captura e renderiza erros de estoque via Sonner
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
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6">
          
          {/* Lista do Carrinho */}
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#484847]/20">
                <div className="flex-1">
                  <span className="text-white font-medium block truncate max-w-[150px]">{item.name}</span>
                  <span className="text-xs text-[#adaaaa]">{formatCurrency(item.price)} un.</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#20201f] rounded-lg">
                    <button onClick={() => updateQuantity(item.id!, item.quantity - 1)} className="p-2 text-[#adaaaa] hover:text-white">
                      <Minus size={16} />
                    </button>
                    <span className="text-white font-bold w-6 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id!, item.quantity + 1)} className="p-2 text-[#adaaaa] hover:text-[#06B6D4]">
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="text-white font-bold w-20 text-right">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-[#adaaaa] text-sm py-4">Seu carrinho está vazio.</p>
            )}
          </div>

          {/* TOTAL Exibido */}
          <div className="flex flex-col items-center pt-2">
            <span className="text-[#adaaaa] text-sm font-bold uppercase tracking-widest">Total da Venda</span>
            <span className="text-[#06B6D4] font-black text-5xl tracking-tighter mt-1">{formatCurrency(total)}</span>
          </div>

          {/* Formas de Pagamento (Chips) */}
          <div className="flex flex-col gap-2">
            <span className="text-[#adaaaa] text-sm font-bold uppercase tracking-widest mb-1">Pagamento</span>
            <div className="grid grid-cols-2 gap-3">
              {(['Dinheiro', 'PIX', 'Crédito', 'Débito'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 rounded-xl font-bold transition-all border ${
                    paymentMethod === method
                      ? "bg-[#004b58] text-[#53ddfc] border-[#53ddfc]"
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
        </div>

        {/* Rodapé CTA */}
        <div className="p-5 border-t border-[#484847]/30 bg-[#121212]">
          <button
            onClick={handleFinalizeSale}
            className="w-full bg-[#06B6D4] hover:bg-[#53ddfc] text-[#004b58] font-black text-lg uppercase tracking-wider py-4 rounded-xl active:scale-[0.98] transition-transform"
          >
            Confirmar Venda
          </button>
        </div>
      </div>
    </div>
  );
}
