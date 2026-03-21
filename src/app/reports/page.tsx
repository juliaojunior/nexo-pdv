"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export default function ReportsPage() {
  // Queries atômicas reativas do Dexie: Toda vez que o banco mudar, os relatórios renderizam na mesma hora.
  const sales = useLiveQuery(() => db.sales.toArray()) || [];
  const saleItems = useLiveQuery(() => db.saleItems.toArray()) || [];

  // Cálculos Diretos (Reduce)
  const totalVendido = sales.reduce((acc, sale) => acc + sale.total, 0);
  const numeroVendas = sales.length;

  // Lógica Top 5 Produtos Mais Vendidos utilizando Hash Map via Reduce
  const productSalesMap = saleItems.reduce((acc, item) => {
    if (!acc[item.productId]) {
      acc[item.productId] = { 
        id: item.productId, 
        name: item.productName, // Utilizamos o snapshot do nome para poupar 1 query com join no db.products!
        quantity: 0 
      };
    }
    acc[item.productId].quantity += item.quantity;
    return acc;
  }, {} as Record<number, { id: number; name: string; quantity: number }>);

  // Mapeamos os valores de volta para um Array, ordenamos de forma Decrescente em quantia e limitamos a 5 itens.
  const top5Products = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-32">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Relatórios</h1>
      </header>
      
      {/* Resumo & Filtro Dinâmico */}
      <div className="flex items-center gap-2 mb-6 bg-[#20201f] w-max px-4 py-2 rounded-xl border border-[#484847]/50 shadow-sm active:scale-95 transition-transform cursor-pointer">
        <span className="font-bold text-sm">Todo o Período</span>
        <ChevronDown size={18} className="text-[#06B6D4]" />
      </div>

      {/* Cards de Métricas Estritos ao Design */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#484847]/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mb-2">Total Vendido</p>
          <p className="text-[#06B6D4] font-black text-2xl lg:text-3xl tracking-tighter truncate">{formatCurrency(totalVendido)}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#484847]/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <p className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mb-2">Nº de Vendas</p>
          <p className="text-white font-black text-2xl lg:text-3xl tracking-tighter">{numeroVendas}</p>
        </div>
      </div>

      {/* Mocking da Estrutura do Gráfico de Volume (Estilo Neon Atelier) */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#484847]/30 shadow-sm mb-8">
        <h2 className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mb-5">Volume (Exemplo)</h2>
        <div className="flex items-end justify-between h-32 gap-3 px-1">
          {/* Distribuição baseada em porcentagem referencial */}
          {[30, 50, 20, 80, 40, 60, 100].map((height, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
              <div 
                className={`w-full rounded-t-sm transition-all shadow-[0_4px_16px_rgba(83,221,252,0.1)] ${height === 100 ? 'bg-[#06B6D4]' : 'bg-[#484847]'}`} 
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 text-[10px] text-[#adaaaa] font-bold px-1">
          <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
        </div>
      </div>

      {/* Seção Top 5 Rankings de Vendas Numéricas */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mb-2 px-1">Top 5 Produtos Mais Vendidos</h2>
        <div className="flex flex-col bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#484847]/30">
          {top5Products.length > 0 ? (
            top5Products.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-4 border-b border-[#484847]/20 last:border-0 hover:bg-[#20201f] transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`font-black text-xl w-4 text-center ${index === 0 ? 'text-[#06B6D4]' : index === 1 ? 'text-[#53ddfc]' : index === 2 ? 'text-white' : 'text-[#adaaaa]'}`}>{index + 1}</span>
                  <span className="font-semibold text-white tracking-tight">{product.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-white font-bold">{product.quantity}</span>
                  <span className="text-[10px] text-[#adaaaa] uppercase font-bold tracking-widest">vendas</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-[#adaaaa] text-sm font-medium">Nenhuma venda faturada ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
