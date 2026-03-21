"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(2, "O nome deve ter no mínimo 2 letras"),
  categoryId: z.coerce.number({ invalid_type_error: "Selecione uma categoria válida" }).min(1, "Selecione uma categoria"),
  price: z.coerce.number({ invalid_type_error: "O preço deve ser um número válido" }).positive("O preço deve ser maior que 0"),
  barcode: z.string().optional(),
  stock: z.coerce.number({ invalid_type_error: "Estoque deve ser um número" }).min(0, "O estoque não pode ser negativo"),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => void;
  categories: { id: number; name: string }[];
}

export function ProductForm({ initialData, onSubmit, categories }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      categoryId: initialData?.categoryId || 0,
      price: initialData?.price || ("" as unknown as number),
      barcode: initialData?.barcode || "",
      stock: initialData?.stock || 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full">
      {/* Field: Nome */}
      <div className="flex flex-col gap-1.5">
        <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.name ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
          Nome do produto
        </label>
        <input 
          {...register("name")}
          type="text"
          placeholder="Ex: Coca-cola 2L"
          className={`w-full bg-[#20201f] rounded-xl py-3 px-4 outline-none text-white transition-all font-medium border ${errors.name ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
        />
        {errors.name && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.name.message}</span>}
      </div>

      {/* Field: Categoria */}
      <div className="flex flex-col gap-1.5">
        <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.categoryId ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
          Categoria
        </label>
        <select 
          {...register("categoryId")}
          className={`w-full bg-[#20201f] rounded-xl py-3 px-4 outline-none text-white transition-all font-medium border appearance-none ${errors.categoryId ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
        >
          <option value={0} disabled>Selecione uma categoria...</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {errors.categoryId && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.categoryId.message}</span>}
      </div>

      {/* Field: Preço de venda */}
      <div className="flex flex-col gap-1.5">
        <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.price ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
          Preço de Venda
        </label>
        <div className="relative">
          <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${errors.price ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>R$</span>
          <input 
            {...register("price")}
            type="number"
            step="0.01"
            placeholder="0.00"
            className={`w-full bg-[#20201f] rounded-xl py-3 pl-12 pr-4 outline-none text-white transition-all font-medium border ${errors.price ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
          />
        </div>
        {errors.price && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.price.message}</span>}
      </div>

      {/* Field: Código de Barras */}
      <div className="flex flex-col gap-1.5">
        <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.barcode ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
          Código de Barras
        </label>
        <div className="relative">
          <input 
            {...register("barcode")}
            type="text"
            placeholder="Opcional"
            className={`w-full bg-[#20201f] rounded-xl py-3 pl-4 pr-12 outline-none text-white transition-all font-medium border ${errors.barcode ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#53ddfc]">
            <Camera size={20} />
          </div>
        </div>
        {errors.barcode && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.barcode.message}</span>}
      </div>

      {/* Field: Estoque */}
      <div className="flex flex-col gap-1.5">
        <label className={`text-xs font-bold uppercase tracking-widest pl-1 transition-colors ${errors.stock ? 'text-[#ff716c]' : 'text-[#adaaaa]'}`}>
          Qtd. Inicial em Estoque
        </label>
        <input 
          {...register("stock")}
          type="number"
          placeholder="0"
          className={`w-full bg-[#20201f] rounded-xl py-3 px-4 outline-none text-white transition-all font-medium border ${errors.stock ? 'border-[#ff716c] focus:ring-1 focus:ring-[#ff716c]' : 'border-[#484847]/50 focus:border-[#06B6D4] focus:ring-1 focus:ring-[#06B6D4]'}`}
        />
        {errors.stock && <span className="text-[#ff716c] text-xs font-semibold pl-1">{errors.stock.message}</span>}
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-[#06B6D4] hover:bg-[#53ddfc] text-[#004b58] font-black text-lg uppercase tracking-wider py-4 rounded-xl mt-6 active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        Salvar
      </button>
    </form>
  );
}
