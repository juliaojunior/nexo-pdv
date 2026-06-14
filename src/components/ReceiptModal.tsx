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
  customerName?: string;
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
         backgroundColor: "#ffffff",
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

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsGenerating(true);
    try {
      const blob = await toBlob(receiptRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 });
      if (!blob) throw new Error("Falha ao gerar a imagem.");
      const link = document.createElement('a');
      link.download = `Nexo_Recibo_${new Date().getTime()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      toast.success("Recibo salvo como imagem!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar o recibo.");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center p-4 sm:p-8 overflow-y-auto backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
      
      <div className="w-full flex flex-col items-center justify-center min-h-max py-8">
        
        <div className="flex flex-col items-center mb-6 animate-pulse shrink-0">
          <CheckCircle size={48} className="text-primary mb-2 shadow-2xl" />
          <h2 className="text-white font-black text-2xl tracking-tight">Venda Sucesso!</h2>
          <p className="text-white/60 text-sm mt-1">Pronto para despachar ao cliente.</p>
        </div>

        {/* THE ACTUAL RECEIPT TO BE CAPTURED (Canvas Target) */}
        <div 
          ref={receiptRef} 
          className="bg-surface w-full max-w-[340px] rounded-t-lg border-t-8 border-primary shadow-xl flex flex-col items-center text-center pb-8 pt-8 px-6 relative overflow-hidden shrink-0"
          style={{ fontFamily: "'Inter', sans-serif" }} // Force font for canvas
        >
           {/* Subtle watermark or pattern could go here */}
           
           <div className="flex flex-col items-center mb-6 w-full border-b border-dashed border-border/70 pb-6">
              <h1 className="text-foreground font-black text-2xl uppercase tracking-tighter leading-tight mb-1 break-words max-w-full px-2">{storeName}</h1>
              {storeDoc && <p className="text-muted text-[10px] uppercase tracking-widest font-bold">Doc: {storeDoc}</p>}
              <p className="text-muted text-[10px] mt-2 font-bold">{new Date(receiptData.date).toLocaleString('pt-BR')}</p>
              {receiptData.customerName && (
                <p className="text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded text-[10px] uppercase mt-2 font-bold tracking-widest">
                  Cli: {receiptData.customerName}
                </p>
              )}
           </div>

           <div className="w-full flex flex-col gap-3 mb-6">
              <div className="flex justify-between text-muted text-[10px] font-bold uppercase tracking-widest mb-1 border-b border-border/30 pb-2">
                 <span>Item</span>
                 <span>Total</span>
              </div>
              
              {receiptData.items.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-start text-sm font-semibold w-full gap-2">
                    <span className="text-gray-700 break-words text-left leading-tight">
                       {item.quantity}x {item.productName}
                    </span>
                    <span className="text-foreground shrink-0 pt-0.5">{formatCurrency(item.subtotal)}</span>
                 </div>
              ))}
           </div>

           <div className="w-full flex flex-col gap-2 rounded-xl bg-background/50 p-4 border border-border/30">
              <div className="flex justify-between items-center">
                 <span className="text-muted text-xs font-bold uppercase tracking-widest">Total Pgto</span>
                 <span className="text-primary-bright font-black text-xl">{formatCurrency(receiptData.total)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                 <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Meio</span>
                 <span className={`${receiptData.paymentMethod === 'Fiado' ? 'text-surface bg-danger' : 'text-foreground bg-surface-raised'} text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest rounded`}>
                   {receiptData.paymentMethod}
                 </span>
              </div>

              {receiptData.paymentMethod === 'Dinheiro' && receiptData.amountReceived && (
                 <>
                   <div className="flex justify-between items-center mt-1">
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Recebido</span>
                     <span className="text-foreground text-[11px] font-bold">{formatCurrency(receiptData.amountReceived)}</span>
                   </div>
                   <div className="flex justify-between items-center mt-1">
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Troco</span>
                     <span className="text-danger text-[11px] font-bold">{formatCurrency(receiptData.change || 0)}</span>
                   </div>
                 </>
              )}
           </div>

           <div className="mt-8 pt-4 border-t border-dashed border-border/50 w-full flex flex-col items-center">
              <span className="text-muted text-[10px] font-bold uppercase tracking-widest text-center">Nexo PDV Digital</span>
              <span className="text-muted text-[10px] mt-1">Obrigado pela preferência!</span>
           </div>
           
           {/* Zigzag bottom styling */}
           <div className="absolute bottom-0 left-0 w-full h-3" style={{ backgroundImage: 'linear-gradient(135deg, transparent 50%, #ffffff 50%), linear-gradient(225deg, transparent 50%, #ffffff 50%)', backgroundSize: '10px 10px' }}></div>
        </div>

        {/* ONSCREEN BUTTONS (Not captured by html2canvas because they are outside ref) */}
        <div className="flex flex-col gap-3 w-full max-w-[340px] mt-6 shrink-0 pb-12">
           <button 
             onClick={handleShare}
             disabled={isGenerating}
             className="w-full h-14 bg-primary text-primary-deep font-black text-lg rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-glow disabled:opacity-50 disabled:scale-100"
           >
             {isGenerating ? <Download className="animate-bounce" /> : <Share2 />}
             {isGenerating ? 'Preparando...' : 'Enviar Recibo'}
           </button>
           
           <button
             onClick={handleDownload}
             disabled={isGenerating}
             className="w-full h-12 bg-white/10 border border-white/30 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
           >
             <Download size={18} /> Baixar imagem
           </button>

           <button
             onClick={onClose}
             disabled={isGenerating}
             className="w-full h-12 bg-transparent border border-white/30 hover:bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
           >
             <X size={18} /> Dispensar
           </button>
        </div>

      </div>
    </div>
  );
}
