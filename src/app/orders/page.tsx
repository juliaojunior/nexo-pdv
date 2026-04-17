"use client";

import { BellRing, CheckCircle, XCircle, ShoppingBag, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { useState } from "react";

interface OrderItem {
  productId: number | string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  cart_items: OrderItem[];
  total_price: number | string;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function OrdersPage() {
  const { data, error, mutate, isLoading } = useSWR('/api/orders?status=PENDING', fetcher, {
    refreshInterval: 10000, // Escuta de 10 em 10 segundos
  });

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);

  const orders: Order[] = data?.orders || [];

  const handleAction = async (order: Order, action: 'ACEITAR' | 'REJEITAR') => {
    setProcessingId(order.id);

    try {
      if (action === 'ACEITAR') {
        // 1. Injeta a Venda + Deduz o Estoque
        const salePayload = {
          total: Number(order.total_price),
          paymentMethod: order.payment_method === 'PIX' ? 'pix' : 'money',
          amountReceived: Number(order.total_price),
          change: 0,
          items: order.cart_items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
            subtotal: item.price * item.quantity,
            productName: item.name
          }))
        };

        const resVenda = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(salePayload)
        });

        if (!resVenda.ok) {
           const errData = await resVenda.json();
           throw new Error(errData.error || "Erro ao processar venda no estoque.");
        }
      }

      // 2. Muda o status do pedido na Nuvem
      const statusFinal = action === 'ACEITAR' ? 'COMPLETED' : 'REJECTED';
      const resOrder = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusFinal })
      });

      if (!resOrder.ok) throw new Error("Falha ao atualizar pedido.");

      toast.success(action === 'ACEITAR' ? "Pagamento Confirmado e Estoque Reduzido!" : "Pedido Rejeitado!");
      setModalOrder(null);
      mutate(); // Recarrega a fila
    } catch (err: any) {
      toast.error(err.message || "Erro desconhecido.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-32 max-w-md mx-auto w-full relative">
      <header className="mb-8 flex items-center justify-between">
        <div>
           <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl flex items-center gap-2">
             <BellRing className={orders.length > 0 ? "animate-bounce text-[#06B6D4]" : ""} /> 
             KDS Delivery
           </h1>
           <p className="text-[#adaaaa] text-sm mt-1">Sua Central de Pedidos Online em Tempo Real</p>
        </div>
        
        {orders.length > 0 && (
          <div className="bg-[#ff716c]/20 text-[#ff716c] px-3 py-1 rounded-full border border-[#ff716c]/40 font-black text-xs animate-pulse">
            {orders.length} PENDENTE(S)
          </div>
        )}
      </header>

      {isLoading && (
         <div className="h-40 flex items-center justify-center text-[#adaaaa] animate-pulse">
           Buscando nuvem...
         </div>
      )}

      {orders.length === 0 && !isLoading && (
        <div className="bg-[#1a1a1a] rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-[#484847]/30 border-dashed mt-10 opacity-70">
           <div className="w-16 h-16 bg-[#20201f] rounded-full flex items-center justify-center mb-4">
             <ShoppingBag size={24} className="text-[#484847]" />
           </div>
           <h3 className="font-black text-white text-lg">Nenhum Pedido</h3>
           <p className="text-[#adaaaa] text-sm mt-1">Sua prateleira está limpa. Divulgue seu link para receber novos pedidos.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
         {orders.map(order => (
           <div key={order.id} className="bg-gradient-to-br from-[#1a1a1a] to-[#121212] border border-[#53ddfc]/20 rounded-2xl p-4 shadow-[0_4px_25px_rgba(6,182,212,0.1)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#53ddfc]/5 rounded-full blur-[40px] pointer-events-none" />
               
               <div className="flex justify-between items-start mb-3 border-b border-[#484847]/30 pb-3">
                  <div>
                     <h2 className="font-black text-white text-lg leading-tight uppercase tracking-wide">{order.customer_name}</h2>
                     <span className="text-[#adaaaa] text-xs flex items-center gap-1 mt-0.5"><Clock size={12}/> {new Date(order.created_at).toLocaleTimeString('pt-BR')}</span>
                  </div>
                  <span className="bg-[#004b58] text-[#53ddfc] px-2 py-1 flex items-center gap-1 rounded font-black text-xs">
                     {order.payment_method}
                  </span>
               </div>

               <div className="flex flex-col gap-2 mb-4">
                  {order.cart_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                       <span className="text-white/90 font-medium"><span className="text-[#53ddfc] font-black mr-2">{item.quantity}x</span>{item.name}</span>
                       <span className="text-[#adaaaa]">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
               </div>

               <div className="flex justify-between items-center bg-[#20201f] p-3 rounded-xl mb-4 border border-[#484847]/30">
                  <span className="text-[#adaaaa] font-bold text-xs uppercase tracking-widest">Total a Receber</span>
                  <span className="text-white font-black text-xl">R$ {Number(order.total_price).toFixed(2).replace('.', ',')}</span>
               </div>

               <button 
                 onClick={() => setModalOrder(order)}
                 className="w-full bg-[#06B6D4] text-[#121212] py-3.5 rounded-xl font-black uppercase tracking-widest active:scale-[0.98] transition-transform shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-[#53ddfc]"
               >
                 Avaliar Pedido
               </button>
           </div>
         ))}
      </div>

      {modalOrder && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-[#121212] p-6 rounded-t-3xl border-t border-[#484847]/50 max-w-md mx-auto w-full animate-in slide-in-from-bottom-5">
               <h3 className="text-xl font-black text-white mb-2 flex flex-col">
                 <span>Muralha de Verificação</span>
                 <span className="text-[#06B6D4] text-sm uppercase tracking-widest">{modalOrder.customer_name}</span>
               </h3>
               
               <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#484847]/50 mb-6 flex items-start gap-4 shadow-inner">
                  <AlertTriangle className="text-[#ff716c] shrink-0 mt-1" />
                  <p className="text-[#adaaaa] text-sm leading-relaxed">
                     O cliente declarou que o método de pagamento será <strong className="text-white">{modalOrder.payment_method}</strong>.
                     Você verificou se o valor de <strong className="text-white">R$ {Number(modalOrder.total_price).toFixed(2).replace('.',',')}</strong> foi recebido ou será recebido em segurança?
                  </p>
               </div>

               <div className="flex flex-col gap-3">
                 <button 
                    disabled={processingId === modalOrder.id}
                    onClick={() => handleAction(modalOrder, 'ACEITAR')}
                    className="w-full bg-[#06B6D4] text-[#121212] py-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest disabled:opacity-50"
                 >
                    {processingId === modalOrder.id ? "Processando e Retirando do Estoque..." : <><CheckCircle /> Sim, Confirmar Pagamento</>}
                 </button>
                 
                 <button 
                    disabled={processingId === modalOrder.id}
                    onClick={() => handleAction(modalOrder, 'REJEITAR')}
                    className="w-full bg-[#1a1a1a] text-[#ff716c] border border-[#ff716c]/30 py-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest disabled:opacity-50"
                 >
                    <XCircle /> Rejeitar Pedido
                 </button>

                 <button 
                    disabled={processingId === modalOrder.id}
                    onClick={() => setModalOrder(null)}
                    className="w-full text-[#adaaaa] py-3 rounded-xl font-bold uppercase tracking-widest text-xs mt-2"
                 >
                    Voltar
                 </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
