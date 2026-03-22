"use client";

import { useEffect, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, CameraOff } from "lucide-react";

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const readerId = "barcode-reader";
    const html5Qrcode = new Html5Qrcode(readerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false
    });

    html5Qrcode
      .start(
        { facingMode: "environment" }, // Usa especificamente a câmera traseira do celular
        {
          fps: 10, // Quadros por segundo para leitura (balanceando bateria x precisão)
          qrbox: { width: 280, height: 150 }, // Aspect ratio de código de barra tradicional
        },
        (decodedText) => {
          // Callback de Sucesso Absoluto
          html5Qrcode.stop().then(() => {
            onDetected(decodedText);
          }).catch(console.error);
        },
        (errorMessage) => {
          // Callback de Erro Leve de Frame (Ignora, acontece a cada frame sem leitura)
        }
      )
      .catch((err) => {
        setError("Erro ao acessar a câmera. Verifique as permissões de vídeo.");
        console.error("Camera startup error:", err);
      });

    // Cleanup: Quando o Modal fechar, desliga o scanner e libera a lente do celular
    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(console.error);
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-center items-center p-4 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Botão Superior para fechar Visor */}
      <button 
        onClick={onClose} 
        className="absolute top-10 right-6 bg-[#20201f] text-[#adaaaa] hover:text-white p-3 rounded-full transition-colors z-10 border border-[#484847]/30"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tighter text-white">Escanear Código</h2>
          <p className="text-[#adaaaa] text-sm mt-1">Aponte a câmera traseira para o produto</p>
        </div>

        {/* Viewport Interativo do Html5Qrcode */}
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black ring-4 ring-[#20201f] ring-offset-2 ring-offset-black shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col items-center justify-center">
          
          {error ? (
            <div className="flex flex-col items-center p-6 text-center">
              <CameraOff size={48} className="text-[#ff716c] mb-4" />
              <span className="text-[#ff716c] font-bold">{error}</span>
            </div>
          ) : (
            <div id="barcode-reader" className="w-full h-[500px] object-cover scale-150 relative -top-12"></div>
          )}

          {/* Mira Estilizada (Decoração Visual Overlay) */}
          {!error && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
               <div className="w-[80%] h-[30%] border-2 border-dashed border-[#06B6D4] rounded-xl relative">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-[#53ddfc] rounded-tl-xl"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-[#53ddfc] rounded-tr-xl"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-[#53ddfc] rounded-bl-xl"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-[#53ddfc] rounded-br-xl"></div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
