"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { toBlob } from "html-to-image";
import { Share2, X, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export interface ReceiptData {
  items: Array<{ productName: string; quantity: number; unitPrice: number; subtotal: number }>;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  date: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, receiptData }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [storeName, setStoreName] = useState("Minha Loja");
  const [storeDoc, setStoreDoc] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStoreName(localStorage.getItem("nexo_storeName") || "Meu Estabelecimento");
      setStoreDoc(localStorage.getItem("nexo_storeDocument") || "");
    }
  }, [isOpen]);

  if (!isOpen || !receiptData) return null;

  const handleShare = async () => {
    if (!receiptRef.current) return;
    setIsGenerating(true);
    toast.info("Processando arquivo para o Zap...", { duration: 1500 });

    try {
      // Usando html-to-image que é muito mais robusto em Mobile DOM e SVGs
      const blob = await toBlob(receiptRef.current, { 
         backgroundColor: "#1e1e1c",
         pixelRatio: 3, 
      });
      
      if (!blob) throw new Error("A biblioteca falhou ao renderizar a imagem.");

      const file = new File([blob], `Nexo_Recibo_${new Date().getTime()}.png`, { type: 'image/png' });

      let sharedSuccessfully = false;

      // Tenta compartilhar primeiro se a API nativa estiver viva
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Recibo - ${storeName}`,
            text: `Aqui está seu recibo digital de compra. Muito Obrigado!`,
          });
          toast.success("Recibo acoplado ao WhatsApp!");
          sharedSuccessfully = true;
        } catch (shareErr: any) {
          // AbortError = usuário só fechou a aba de compartilhamento.
          if (shareErr.name === 'AbortError') {
             sharedSuccessfully = true; 
          } else {
             console.error("Share cancelado/falhou:", shareErr);
          }
        }
      }

      // Se falhou compartilhar nativamente ou não suporta array de Files (PC/Desktop/WebViews velhos)
      if (!sharedSuccessfully) {
         const link = document.createElement('a');
         link.download = file.name;
         link.href = URL.createObjectURL(blob);
         link.click();
         toast.success("Recibo digital salvo na galeria como imagem!");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro fatal ao desenhar o cupom digital.");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col justify-center items-center p-4 sm:p-8 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
      
      <div className="flex flex-col items-center mb-6 animate-pulse">
        <CheckCircle size={48} className="text-[#06B6D4] mb-2 shadow-2xl" />
        <h2 className="text-white font-black text-2xl tracking-tight">Venda Sucesso!</h2>
        <p className="text-[#adaaaa] text-sm mt-1">Pronto para despachar ao cliente.</p>
      </div>

      {/* THE ACTUAL RECEIPT TO BE CAPTURED (Canvas Target) */}
      <div 
        ref={receiptRef} 
        className="bg-[#1e1e1c] w-full max-w-[340px] rounded-t-lg border-t-8 border-[#06B6D4] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center pb-8 pt-8 px-6 relative overflow-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }} // Force font for canvas
      >
         {/* Subtle watermark or pattern could go here */}
         
         <div className="flex flex-col items-center mb-6 w-full border-b border-dashed border-[#484847]/70 pb-6">
            <h1 className="text-white font-black text-2xl uppercase tracking-tighter leading-tight mb-1">{storeName}</h1>
            {storeDoc && <p className="text-[#adaaaa] text-[10px] uppercase tracking-widest font-bold">Doc: {storeDoc}</p>}
            <p className="text-[#484847] text-[10px] mt-2 font-bold">{new Date(receiptData.date).toLocaleString('pt-BR')}</p>
         </div>

         <div className="w-full flex flex-col gap-3 mb-6">
            <div className="flex justify-between text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest mb-1 border-b border-[#484847]/30 pb-2">
               <span>Item</span>
               <span>Total</span>
            </div>
            
            {receiptData.items.map((item, idx) => (
               <div key={idx} className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-gray-300 truncate max-w-[180px] text-left">
                     {item.quantity}x {item.productName}
                  </span>
                  <span className="text-white">{formatCurrency(item.subtotal)}</span>
               </div>
            ))}
         </div>

         <div className="w-full flex flex-col gap-2 rounded-xl bg-[#131313]/50 p-4 border border-[#484847]/30">
            <div className="flex justify-between items-center">
               <span className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest">Total Pgto</span>
               <span className="text-[#53ddfc] font-black text-xl">{formatCurrency(receiptData.total)}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
               <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest">Meio</span>
               <span className="text-white text-xs font-bold bg-[#1a1a1a] px-2 py-1 rounded">{receiptData.paymentMethod}</span>
            </div>

            {receiptData.paymentMethod === 'Dinheiro' && receiptData.amountReceived && (
               <>
                 <div className="flex justify-between items-center mt-1">
                   <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest">Recebido</span>
                   <span className="text-white text-xs font-bold">{formatCurrency(receiptData.amountReceived)}</span>
                 </div>
                 <div className="flex justify-between items-center mt-1">
                   <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest">Troco</span>
                   <span className="text-[#ff716c] text-xs font-bold">{formatCurrency(receiptData.change || 0)}</span>
                 </div>
               </>
            )}
         </div>

         <div className="mt-8 pt-4 border-t border-dashed border-[#484847]/50 w-full flex flex-col items-center">
            <span className="text-[#adaaaa] text-[10px] font-bold uppercase tracking-widest text-center">Nexo PDV Digital</span>
            <span className="text-[#484847] text-[8px] mt-1">Obrigado pela preferência!</span>
         </div>
         
         {/* Zigzag bottom styling */}
         <div className="absolute bottom-0 left-0 w-full h-3" style={{ backgroundImage: 'linear-gradient(135deg, transparent 50%, #1e1e1c 50%), linear-gradient(225deg, transparent 50%, #1e1e1c 50%)', backgroundSize: '10px 10px' }}></div>
      </div>

      {/* ONSCREEN BUTTONS (Not captured by html2canvas because they are outside ref) */}
      <div className="flex flex-col gap-3 w-full max-w-[340px] mt-6">
         <button 
           onClick={handleShare}
           disabled={isGenerating}
           className="w-full h-14 bg-gradient-to-tr from-[#06B6D4] to-[#53ddfc] text-[#004b58] font-black text-lg rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_24px_rgba(6,182,212,0.4)] disabled:opacity-50"
         >
           {isGenerating ? <Download className="animate-bounce" /> : <Share2 />}
           {isGenerating ? 'Prearando...' : 'Enviar Recibo'}
         </button>
         
         <button 
           onClick={onClose}
           disabled={isGenerating}
           className="w-full h-14 bg-transparent border border-[#484847] hover:bg-[#1a1a1a] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
         >
           <X size={18} /> Dispensar
         </button>
      </div>

    </div>
  );
}
