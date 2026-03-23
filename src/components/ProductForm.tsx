"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ImagePlus, X, PercentCircle } from "lucide-react";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { toast } from "sonner";
import { isPromotionActive } from "@/lib/utils";

// Schema refinado para garantir que ambos input e data da promoção existem SE ela for ativada
const productSchema = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 letras"),
  categoryId: z.number().min(1, "Selecione uma categoria válida"),
  price: z.number().positive("O preço deve ser maior que 0"),
  barcode: z.string().optional(),
  stock: z.number().min(0, "O estoque não pode ser negativo"),
  image: z.string().optional(),
  
  hasPromotion: z.boolean().optional(),
  promotionalPrice: z.number().min(0).optional(),
  promotionEndDate: z.string().optional(),
}).refine((data) => {
  if (data.hasPromotion) {
    return data.promotionalPrice && data.promotionalPrice > 0 && !!data.promotionEndDate;
  }
  return true;
}, {
  message: "Defina o valor e a validade corretamente.",
  path: ["promotionalPrice"] // Lança o erro visual nesse campo
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormValues>;
  onSubmit: (data: Omit<ProductFormValues, 'hasPromotion'>) => void;
  categories: { id?: number; name: string }[];
}

export function ProductForm({ initialData, onSubmit, categories }: ProductFormProps) {
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(initialData?.image || null);

  // Calcula se já tinha uma prom ativa nos dados iniciais
  const wasPromoActive = initialData ? isPromotionActive({
      promotionalPrice: initialData.promotionalPrice,
      promotionEndDate: initialData.promotionEndDate
  }) : false;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      categoryId: initialData?.categoryId || 0,
      price: initialData?.price,
      barcode: initialData?.barcode || "",
      stock: initialData?.stock || 0,
      image: initialData?.image || "",
      hasPromotion: wasPromoActive,
      promotionalPrice: initialData?.promotionalPrice,
      promotionEndDate: initialData?.promotionEndDate ? new Date(initialData.promotionEndDate).toISOString().slice(0, 16) : undefined,
    },
  });

  const hasPromoSelected = watch("hasPromotion");

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 400;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          const scale = Math.max(SIZE / img.width, SIZE / img.height);
          const x = (SIZE - img.width * scale) / 2;
          const y = (SIZE - img.height * scale) / 2;
          
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          const base64Data = canvas.toDataURL("image/jpeg", 0.6);
          setPreviewImage(base64Data);
          setValue("image", base64Data, { shouldDirty: true });
        }
      };
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Prepara o interceptador isolando variáveis virtuais do banco de dados (Zod form data => DB interface)
  const submitInterceptor = (data: any) => {
    const payload = {
       ...data,
       promotionalPrice: data.hasPromotion ? data.promotionalPrice : undefined,
       promotionEndDate: data.hasPromotion ? data.promotionEndDate : undefined,
    };
    // Desvincula
    delete (payload as unknown as Record<string, unknown>).hasPromotion;
    
    onSubmit(payload as Omit<ProductFormValues, 'hasPromotion'>);
  };

  return (
    <>
      <form onSubmit={handleSubmit(submitInterceptor)} className="flex flex-col gap-6 w-full pb-20">
        
        {/* Foto do Produto */}
        <div className="flex justify-center mb-2">
          <label className="relative w-32 h-32 rounded-3xl overflow-hidden bg-[#20201f] border border-[#484847]/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#53ddfc] transition-colors shadow-sm active:scale-95 group">
            {previewImage ? (
              <>
                <img src={previewImage} alt="Produto" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImagePlus size={24} className="text-white" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-[#adaaaa] group-hover:text-[#53ddfc] transition-colors gap-2">
                <ImagePlus size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-center px-2">Add Foto</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleImageCapture}
              className="hidden" 
            />
          </label>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.name ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
              Nome do produto
            </label>
            <input 
              {...register("name")}
              type="text"
              placeholder="Ex: Coca-cola 2L"
              className={`w-full bg-[#20201f] rounded-xl py-3.5 px-4 outline-none text-white font-medium border ${errors.name ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
            />
            {errors.name && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.name.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.categoryId ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
              Categoria
            </label>
            <select 
              {...register("categoryId", { valueAsNumber: true })}
              className={`w-full bg-[#20201f] rounded-xl py-3.5 px-4 outline-none text-white font-medium border appearance-none ${errors.categoryId ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
            >
              <option value={0} disabled>Selecione uma categoria...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.categoryId.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.price ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
              Preço Base
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${errors.price ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>R$</span>
              <input 
                {...register("price", { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                className={`w-full bg-[#20201f] rounded-xl py-3.5 pl-12 pr-4 outline-none text-white font-medium border ${errors.price ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
              />
            </div>
            {errors.price && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.price.message}</span>}
          </div>

          {/* SESSÃO PROMOÇÃO COM SWITCH ESTILIZADO */}
          <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#06B6D4]/30 shadow-inner mt-2 duration-300 relative overflow-hidden group">
            <div className="flex items-center justify-between z-10 relative">
               <div className="flex items-center gap-2 text-white">
                 <PercentCircle size={20} className={hasPromoSelected ? "text-[#53ddfc]" : "text-[#adaaaa]"} />
                 <span className="font-bold text-sm tracking-wide">Configurar Oferta</span>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input type="checkbox" {...register("hasPromotion")} className="sr-only peer" />
                 <div className="w-11 h-6 bg-[#20201f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06B6D4]"></div>
               </label>
            </div>

            {hasPromoSelected && (
              <div className="mt-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 z-10 relative">
                <div className="flex gap-3">
                   <div className="flex-1 flex flex-col gap-1.5">
                     <label className={`text-[10px] font-bold uppercase tracking-widest pl-1 transition-colors ${errors.promotionalPrice ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
                       Novo Preço
                     </label>
                     <input 
                       {...register("promotionalPrice", { valueAsNumber: true })}
                       type="number"
                       step="0.01"
                       placeholder="0.00"
                       className={`w-full bg-[#121212] rounded-xl py-2.5 px-3 outline-none text-[#53ddfc] font-black border ${errors.promotionalPrice ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4]'}`}
                     />
                   </div>
                   
                   <div className="flex-1 flex flex-col gap-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-widest pl-1 text-[#adaaaa] transition-colors">
                       Validade (Até)
                     </label>
                     <input 
                       {...register("promotionEndDate")}
                       type="datetime-local" // O navegador cuidará do datepicker nativo em devices mobiles e desktops
                       className="w-full bg-[#121212] rounded-xl py-2.5 px-3 outline-none text-white font-medium border border-[#484847]/50 focus:border-[#06B6D4] text-sm"
                     />
                   </div>
                </div>
                {errors.promotionalPrice && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.promotionalPrice.message}</span>}
              </div>
            )}
            
            {/* Efeito Glow Lente Fundo Card Promoção */}
            {hasPromoSelected && <div className="absolute -inset-10 bg-gradient-to-br from-[#06B6D4]/5 to-transparent pointer-events-none rounded-2xl" />}
          </div>
          

          <div className="flex flex-col gap-1.5 mt-2">
            <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.barcode ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
              Código de Barras
            </label>
            <div className="flex gap-2">
              <input 
                {...register("barcode")}
                type="text"
                placeholder="Ex: 78910"
                className={`w-full bg-[#20201f] rounded-xl py-3.5 pl-4 pr-3 outline-none text-white font-medium border ${errors.barcode ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
              />
              <button 
                type="button" 
                onClick={() => setScannerOpen(true)}
                className="bg-[#20201f] text-[#53ddfc] p-4 rounded-xl border border-[#484847]/50 hover:bg-[#004b58] active:scale-95 transition-all shadow-sm"
              >
                <Camera size={20} />
              </button>
            </div>
            {errors.barcode && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.barcode.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.stock ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
              Estoque da Vitrine
            </label>
            <input 
              {...register("stock", { valueAsNumber: true })}
              type="number"
              placeholder="0"
              className={`w-full bg-[#20201f] rounded-xl py-3.5 px-4 outline-none text-white font-medium border ${errors.stock ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
            />
            {errors.stock && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.stock.message}</span>}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full fixed bottom-5 left-1/2 -translate-x-1/2 max-w-[calc(100%-2rem)] sm:relative sm:left-auto sm:translate-x-0 sm:max-w-none bg-[#06B6D4] hover:bg-[#53ddfc] text-[#004b58] font-black text-lg uppercase tracking-wider py-4 rounded-xl mt-4 sm:mt-0 active:scale-[0.98] transition-transform disabled:opacity-50 z-50 shadow-[0_4px_32px_rgba(6,182,212,0.4)]"
        >
          {isSubmitting ? "Finalizando..." : "Salvar Produto"}
        </button>
      </form>

      {isScannerOpen && (
        <BarcodeScannerModal 
          onClose={() => setScannerOpen(false)}
          onDetected={(code) => {
            setValue("barcode", code, { shouldValidate: true, shouldDirty: true });
            setScannerOpen(false);
            toast.success("Capturado!");
          }}
        />
      )}
    </>
  );
}
