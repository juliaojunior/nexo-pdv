"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { formatCurrency, getEffectivePrice } from "@/lib/utils";
import { CheckCircle2, XCircle, ArrowLeft, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function ProcessOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const products = useLiveQuery(() => db.products.toArray());
  
  const orderParam = searchParams.get("order");
  const customerParam = searchParams.get("customer") || "Cliente Web";

  const [orderItems, setOrderItems] = useState<{product: any, quantity: number}[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (products && orderParam) {
       const rawItems = orderParam.split(",");
       const mappedItems: typeof orderItems = [];
       let calcTotal = 0;

       for (const raw of rawItems) {
          const [idStr, qtyStr] = raw.split(":");
          const product = products.find(p => p.id === Number(idStr));
          if (product) {
             const qty = Number(qtyStr);
             mappedItems.push({ product, quantity: qty });
             calcTotal += getEffectivePrice(product) * qty;
          }
       }
       
       setOrderItems(mappedItems);
       setTotal(calcTotal);
    }
  }, [products, orderParam]);

  const handleApprove = async () => {
     if (!orderItems || orderItems.length === 0) return;

     try {
       // Preparamos os Itens para o formato Omit<SaleItem, 'id' | 'saleId'>
       const saleItems = orderItems.map(item => ({
           productId: item.product.id!,
           productName: item.product.name,
           quantity: item.quantity,
           unitPrice: getEffectivePrice(item.product),
           subtotal: getEffectivePrice(item.product) * item.quantity
       }));

       // Salva a venda rodando a transação atômica
       const saleId = await db.finalizeSale({
           total: total,
           paymentMethod: "PIX",
           date: new Date().toISOString()
       }, saleItems);

       toast.success("Pedido aprovado e estoque abatido!");
       router.push("/");
       
     } catch (e) {
       toast.error("Ocorreu um erro ao processar o pedido.");
     }
  };

  const handleErrorOrCancel = () => {
     router.push("/");
  };

  if (!products) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted animate-pulse">Lendo banco de dados protegido...</p></div>
  }

  if (!orderItems || orderItems.length === 0) {
     return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center text-white">
          <XCircle size={64} className="text-danger mb-4" />
          <h2 className="text-xl font-black mb-2">Pedido Inválido ou Já Processado</h2>
          <p className="text-muted mb-8">Não conseguimos encontrar os produtos deste link no seu banco atual.</p>
          <Link href="/" className="bg-surface-raised py-3 px-6 rounded-xl font-bold border border-border/30">Voltar ao Caixa</Link>
       </div>
     )
  }

  return (
    <div className="bg-background min-h-screen text-foreground font-[Inter] flex flex-col max-w-md mx-auto relative px-4 py-8">
      <header className="mb-8 flex items-center gap-3">
         <div className="bg-primary-deep text-primary p-2.5 rounded-full">
           <PackageCheck size={24} />
         </div>
         <div className="flex flex-col">
           <h1 className="text-white font-black tracking-tight text-2xl leading-none">Aprovar Pedido</h1>
           <span className="text-muted text-xs font-semibold uppercase tracking-widest mt-1">Via Cardápio Digital</span>
         </div>
      </header>

      <div className="bg-surface p-5 rounded-3xl border border-primary/30 shadow-glow mb-6 relative overflow-hidden">
         
         <div className="flex flex-col mb-6 relative z-10">
           <span className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Cliente Solicitante</span>
           <span className="text-xl font-black text-white">{customerParam}</span>
         </div>

         <div className="flex flex-col gap-3 relative z-10 border-t border-border/30 pt-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Resumo dos Itens Mapeados</span>
            {orderItems.map((item, idx) => (
               <div key={idx} className="flex justify-between items-center bg-surface-raised p-3 rounded-xl border border-border/20 shadow-inner">
                  <div className="flex items-center gap-3">
                     <div className="bg-surface w-8 h-8 rounded-lg flex items-center justify-center font-black text-primary-bright border border-border/40 shadow-sm">{item.quantity}x</div>
                     <span className="font-bold text-sm tracking-tight">{item.product.name}</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="font-black text-primary-bright">{formatCurrency(getEffectivePrice(item.product) * item.quantity)}</span>
                     {item.quantity > item.product.stock && (
                        <span className="text-[10px] text-danger font-bold uppercase tracking-widest mt-0.5">Estoque Insuficiente!</span>
                     )}
                  </div>
               </div>
            ))}
         </div>

         <div className="flex justify-between items-center mt-6 pt-5 border-t border-border/30 relative z-10">
            <span className="font-bold text-muted uppercase tracking-widest text-sm">Total da Venda</span>
            <span className="font-black text-3xl text-white">{formatCurrency(total)}</span>
         </div>
      </div>

      <div className="flex flex-col gap-3 mt-auto pt-4">
         <button 
           onClick={handleApprove}
           className="w-full bg-primary text-primary-deep font-black text-lg uppercase tracking-wider py-4 rounded-xl shadow-glow hover:bg-primary-bright active:scale-95 transition-all text-center flex justify-center items-center gap-2"
         >
           <CheckCircle2 size={24} />
           Aprovar e Dar Baixa
         </button>
         <button 
           onClick={handleErrorOrCancel}
           className="w-full bg-surface-raised text-muted font-bold text-sm uppercase tracking-wider py-4 rounded-xl border border-border/50 active:scale-95 transition-all text-center hover:text-white"
         >
           Cancelar / Ignorar
         </button>
      </div>
    </div>
  )
}

export default function ProcessOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
       <ProcessOrderContent />
    </Suspense>
  )
}
