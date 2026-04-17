import { redirect } from "next/navigation";

export default function CatalogRootPage() {
  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center font-[Inter] text-white p-4 text-center">
      <div className="bg-[#1a1a1a] border border-[#484847]/30 p-8 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl">
         <h1 className="text-3xl font-black text-[#53ddfc] mb-2 tracking-tighter">Erro de Acesso</h1>
         <p className="text-[#adaaaa] text-sm font-medium leading-relaxed">
            Esta é a base do servidor de Catálogos da Nexo. <br/>Para visualizar os produtos e realizar pedidos, você precisa do link completo fornecido pela loja (exemplo: <span className="text-white font-bold bg-[#333] px-1 rounded">nexo.vercel.app/c/ID_DA_LOJA</span>).
         </p>
      </div>
    </div>
  );
}
