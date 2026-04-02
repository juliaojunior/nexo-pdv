"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type TimeFilter = 'month' | 'year' | 'all';

export default function ReportsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Queries atômicas reativas do Dexie recuperando dados brutos da base local
  const allSales = useLiveQuery(() => db.sales.toArray()) || [];
  const allSaleItems = useLiveQuery(() => db.saleItems.toArray()) || [];

  // Lógica de Filtragem de Tempo Baseada na Data da Venda
  const now = new Date();
  
  const sales = useMemo(() => {
    if (timeFilter === 'all') return allSales;
    return allSales.filter(sale => {
      const saleDate = new Date(sale.date);
      if (timeFilter === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'year') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [allSales, timeFilter]);

  // Filtra de forma cascata os items das vendas baseados nos IDS das vendas filtradas no período escolhido
  const saleItems = useMemo(() => {
    if (timeFilter === 'all') return allSaleItems;
    const activeSaleIds = new Set(sales.map(s => s.id));
    return allSaleItems.filter(item => activeSaleIds.has(item.saleId));
  }, [allSaleItems, sales]);

  // Cálculos Diretos (Reduce) considerando apenas os dados filtrados
  const totalVendido = sales.reduce((acc, sale) => acc + sale.total, 0);
  const numeroVendas = sales.length;

  // Lógica Top 5 Produtos Mais Vendidos via HashMap
  const productSalesMap = saleItems.reduce((acc, item) => {
    if (!acc[item.productId]) {
      acc[item.productId] = { 
        id: item.productId, 
        name: item.productName,
        quantity: 0 
      };
    }
    acc[item.productId].quantity += item.quantity;
    return acc;
  }, {} as Record<number, { id: number; name: string; quantity: number }>);

  // Mapeamos os valores de volta para um Array e ordenamos decrescente
  const top5Products = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Lógica Real do Gráfico de Volume (Agregação por Dia da Semana: Seg a Dom)
  const chartData = useMemo(() => {
    // Índices do JS (0 = Dom, 1 = Seg ... 6 = Sáb)
    const rawTotals = [0, 0, 0, 0, 0, 0, 0];
    
    sales.forEach(sale => {
      const day = new Date(sale.date).getDay();
      rawTotals[day] += sale.total;
    });

    // Reordenamos para o padrão Visual: Seg, Ter, Qua, Qui, Sex, Sáb, Dom
    const orderedTotals = [
      rawTotals[1], rawTotals[2], rawTotals[3], rawTotals[4], 
      rawTotals[5], rawTotals[6], rawTotals[0]
    ];

    const maxVal = Math.max(...orderedTotals, 0); // Evita Inifinity
    
    return orderedTotals.map(val => ({
      value: val,
      // Se nenhma venda registrada, 0%. Se registrada, escala em %, mas garante 5% visual mínimo.
      percent: maxVal === 0 ? 0 : val === 0 ? 0 : Math.max(5, Math.round((val / maxVal) * 100))
    }));
  }, [sales]);

  return (
    <div className="bg-[#121212] min-h-screen text-[#F3F4F6] font-['Inter'] px-4 py-8 pb-32">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-[#53ddfc] font-black tracking-tighter text-2xl">Relatórios</h1>
      </header>
      
      {/* Resumo & Filtro Dinâmico */}
      <div className="relative mb-6">
        <div 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 bg-[#20201f] w-max px-4 py-2 rounded-xl border border-[#484847]/50 shadow-sm active:scale-95 transition-transform cursor-pointer"
        >
          <span className="font-bold text-sm">
            {timeFilter === 'month' ? 'Este mês' : timeFilter === 'year' ? 'Este ano' : 'Sempre'}
          </span>
          <ChevronDown size={18} className={`text-[#06B6D4] transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
        </div>
        
        {isFilterOpen && (
          <>
            {/* Backdrop Layer */}
            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
            {/* Dropdown Card */}
            <div className="absolute top-12 left-0 w-40 bg-[#1a1a1a] border border-[#484847]/50 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => { setTimeFilter('month'); setIsFilterOpen(false); }}
                className={`text-left px-4 py-3 text-sm font-bold transition-colors hover:bg-[#20201f] ${timeFilter === 'month' ? 'text-[#53ddfc]' : 'text-white'}`}
              >
                Este mês
              </button>
              <button 
                onClick={() => { setTimeFilter('year'); setIsFilterOpen(false); }}
                className={`text-left px-4 py-3 text-sm font-bold transition-colors hover:bg-[#20201f] border-t border-[#484847]/30 ${timeFilter === 'year' ? 'text-[#53ddfc]' : 'text-white'}`}
              >
                Este ano
              </button>
              <button 
                onClick={() => { setTimeFilter('all'); setIsFilterOpen(false); }}
                className={`text-left px-4 py-3 text-sm font-bold transition-colors hover:bg-[#20201f] border-t border-[#484847]/30 ${timeFilter === 'all' ? 'text-[#53ddfc]' : 'text-white'}`}
              >
                Sempre
              </button>
            </div>
          </>
        )}
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

      {/* Gráfico de Volume Dinâmico */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#484847]/30 shadow-sm mb-8">
        <h2 className="text-[#adaaaa] text-xs font-bold uppercase tracking-widest mb-5">Volume de Vendas</h2>
        <div className="flex items-end justify-between h-32 gap-3 px-1">
          {chartData.map((data, i) => {
            const isHighest = data.percent === 100 && data.value > 0;
            return (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end relative group">
                <div 
                  className={`w-full rounded-t-sm transition-all duration-500 ease-out 
                    ${isHighest ? 'bg-[#06B6D4] shadow-[0_4px_16px_rgba(6,182,212,0.3)]' : 'bg-[#484847] hover:bg-[#adaaaa]'}`} 
                  style={{ height: `${data.percent}%`, minHeight: data.value > 0 ? '4%' : '0%' }}
                  title={formatCurrency(data.value)}
                />
              </div>
            );
          })}
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
