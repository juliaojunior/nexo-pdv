"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { formatCurrency } from "@/lib/utils";
import { toBlob } from "html-to-image";
import { Share2, X, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

// Converte um Blob para base64 puro (sem o prefixo "data:...;base64,"),
// formato exigido pelo Filesystem do Capacitor.
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface ReceiptData {
  items: Array<{ productName: string; quantity: number; unitPrice: number; discount?: number; subtotal: number }>;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  date: string;
  discountTotal?: number;
  customerName?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, receiptData }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Nome/documento da loja vêm da fonte autoritativa (nuvem). O localStorage é só
  // cache para leitura instantânea/offline; o texto genérico é o último recurso.
  const { data: settings } = useSWR<Record<string, string>>(
    "/api/settings",
    (u: string) => fetch(u).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const storeName =
    settings?.nexo_storeName ||
    (typeof window !== "undefined" ? localStorage.getItem("nexo_storeName") : "") ||
    "Meu Estabelecimento";
  const storeDoc =
    settings?.nexo_storeDocument ||
    (typeof window !== "undefined" ? localStorage.getItem("nexo_storeDocument") : "") ||
    "";
  const storePhone =
    settings?.nexo_storePhone ||
    (typeof window !== "undefined" ? localStorage.getItem("nexo_storePhone") : "") ||
    "";

  // Espelha no localStorage quando a nuvem responde (cache p/ próximas aberturas/offline)
  useEffect(() => {
    if (typeof window === "undefined" || !settings) return;
    if (settings.nexo_storeName) localStorage.setItem("nexo_storeName", settings.nexo_storeName);
    if (settings.nexo_storeDocument) localStorage.setItem("nexo_storeDocument", settings.nexo_storeDocument);
    if (settings.nexo_storePhone) localStorage.setItem("nexo_storePhone", settings.nexo_storePhone);
  }, [settings]);

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

      const fileName = `Nexo_Recibo_${new Date().getTime()}.png`;

      // 1) App nativo (Capacitor): a WebView do Android não expõe navigator.share
      // com arquivos, então usamos o plugin Share — grava no cache e abre a folha
      // de compartilhamento do sistema (WhatsApp/Instagram/Gmail...).
      if (Capacitor.isNativePlatform()) {
        try {
          const base64 = await blobToBase64(blob);
          const written = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache,
          });
          await Share.share({
            title: `Recibo - ${storeName}`,
            text: "Aqui está seu recibo digital de compra. Muito Obrigado!",
            files: [written.uri],
            dialogTitle: "Enviar recibo",
          });
          toast.success("Recibo pronto para enviar!");
          return;
        } catch (nativeErr: any) {
          const msg = String(nativeErr?.message || "").toLowerCase();
          // Usuário fechou a folha de compartilhamento: não é erro.
          if (msg.includes("cancel") || msg.includes("abort")) return;
          // Falha real no plugin (ex.: APK sem o plugin): cai para o fallback web abaixo.
          console.error("Share nativo falhou, tentando fallback web:", nativeErr);
        }
      }

      // 2) Web (PWA/desktop): Web Share API com arquivos; senão, baixa a imagem.
      const file = new File([blob], fileName, { type: 'image/png' });
      let sharedSuccessfully = false;

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
           
           {/* Cabeçalho: nome da loja */}
           <div className="flex flex-col items-center mb-4 w-full">
              <h1 className="text-foreground font-black text-2xl uppercase tracking-tighter leading-tight break-words max-w-full px-2 text-center">{storeName}</h1>
              {storeDoc && <p className="text-muted text-[10px] uppercase tracking-widest font-bold mt-0.5">Doc: {storeDoc}</p>}
           </div>

           {/* RECIBO + data */}
           <div className="flex flex-col items-center w-full border-t border-b border-border/40 py-3 mb-3">
              <h2 className="text-foreground font-black text-lg tracking-tight">RECIBO</h2>
              <p className="text-muted text-[11px] font-bold mt-0.5">{new Date(receiptData.date).toLocaleString('pt-BR')}</p>
           </div>

           {/* Cliente */}
           {receiptData.customerName && (
              <div className="w-full text-left mb-3">
                 <p className="text-gray-700 text-xs"><span className="font-black text-foreground uppercase">Cliente:</span> {receiptData.customerName}</p>
              </div>
           )}

           {/* Tabela de itens */}
           <div className="w-full mb-4">
              <div className="grid grid-cols-[1fr_1.75rem_3.25rem_3.75rem] gap-x-1.5 text-muted text-[9px] font-black uppercase tracking-widest border-b border-border/50 pb-1 mb-2">
                 <span className="text-left">Item</span>
                 <span className="text-center">Qtde</span>
                 <span className="text-right">Unit.</span>
                 <span className="text-right">Subtotal</span>
              </div>

              {receiptData.items.map((item, idx) => {
                 const gross = item.unitPrice * item.quantity;
                 const hasDiscount = !!item.discount && item.discount > 0;
                 return (
                    <div key={idx} className="grid grid-cols-[1fr_1.75rem_3.25rem_3.75rem] gap-x-1.5 items-start text-[11px] font-semibold mb-2">
                       <span className="text-gray-700 text-left leading-tight break-words">{idx + 1}. {item.productName}</span>
                       <span className="text-gray-700 text-center">{item.quantity}</span>
                       <span className="text-gray-700 text-right text-[10px]">{formatCurrency(item.unitPrice)}</span>
                       <span className="text-foreground text-right text-[10px] flex flex-col leading-tight">
                          {/* valor após o desconto em cima; original entre parênteses e itálico embaixo */}
                          <span>{formatCurrency(item.subtotal)}</span>
                          {hasDiscount && <span className="text-muted/70 italic">({formatCurrency(gross)})</span>}
                       </span>
                    </div>
                 );
              })}
           </div>

           {/* TOTAL DA VENDA */}
           <div className="w-full flex justify-between items-center border-t-2 border-border/60 pt-3 mb-4">
              <span className="text-foreground font-black text-base uppercase tracking-tight">Total da Venda:</span>
              <span className="text-foreground font-black text-xl">{formatCurrency(receiptData.total)}</span>
           </div>

           {/* Forma de pagamento */}
           <div className="w-full flex flex-col gap-1 rounded-lg bg-background/60 p-3 border border-border/30 text-left mb-4">
              <span className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Forma de Pagamento:</span>
              <div className="flex justify-between items-center">
                 <span className={`text-[11px] font-bold px-2 py-0.5 uppercase tracking-widest rounded ${receiptData.paymentMethod === 'Fiado' ? 'text-surface bg-danger' : 'text-foreground bg-surface-raised'}`}>
                   {receiptData.paymentMethod}
                 </span>
                 <span className="text-foreground font-black text-sm">{formatCurrency(receiptData.total)}</span>
              </div>
              {receiptData.paymentMethod === 'Dinheiro' && receiptData.amountReceived ? (
                 <>
                   <div className="flex justify-between items-center mt-1">
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Recebido</span>
                     <span className="text-foreground text-[11px] font-bold">{formatCurrency(receiptData.amountReceived)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-muted text-[10px] font-bold uppercase tracking-widest">Troco</span>
                     <span className="text-danger text-[11px] font-bold">{formatCurrency(receiptData.change || 0)}</span>
                   </div>
                 </>
              ) : null}
           </div>

           {/* Rodapé */}
           <div className="w-full flex flex-col items-center">
              <p className="text-foreground text-[11px] font-bold text-center">
                 Obrigado pela preferência{receiptData.customerName ? `, ${receiptData.customerName}` : ''}! Volte sempre!
              </p>
              {(storeName || storePhone) && (
                 <p className="text-muted text-[10px] mt-1 text-center break-words">
                   {storeName}{storePhone ? ` | ${storePhone}` : ''}
                 </p>
              )}
              <div className="w-full border-t border-dashed border-border/50 mt-3 pt-3 flex flex-col items-center">
                 <span className="text-muted text-[9px] uppercase tracking-widest">Gerado por</span>
                 <span className="text-foreground text-[11px] font-black">Nexo PDV — Fácil &amp; Rápido</span>
              </div>
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
