"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type TimeFilter = 'month' | 'year' | 'all';

// Mini-tendência (sparkline) em SVG. Usa currentColor, então a cor vem do
// container (ex: text-primary). Sem dados suficientes, mostra uma linha base.
function Sparkline({ values, height = 30 }: { values: number[]; height?: number }) {
  const hasTrend = values.length >= 2 && Math.max(...values) > 0;
  if (!hasTrend) {
    return <div className="w-full border-t border-dashed border-border/60" style={{ height }} />;
  }
  const width = 100;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => [i * stepX, height - 3 - ((v - min) / range) * (height - 6)]);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function ReportsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Queries na Nuvem usando SWR recuperando dados consolidados via Vercel
  const { data: rawSales, isLoading } = useSWR("/api/sales", (url: string) => fetch(url).then(r => r.json()));
  
  const allSales = rawSales || [];
  const allSaleItems = allSales.flatMap((s: any) => s.items.map((i: any) => ({ ...i, saleId: s.id })));

  // Lógica de Filtragem de Tempo Baseada na Data da Venda
  const now = new Date();
  
  const sales = useMemo(() => {
    if (timeFilter === 'all') return allSales;
    return allSales.filter((sale: any) => {
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
    const activeSaleIds = new Set(sales.map((s: any) => s.id));
    return allSaleItems.filter((item: any) => activeSaleIds.has(item.saleId));
  }, [allSaleItems, sales]);

  // Cálculos Diretos (Reduce) considerando apenas os dados filtrados
  const totalVendido = sales.reduce((acc: number, sale: any) => acc + Number(sale.total || 0), 0);
  const numeroVendas = sales.length;

  // Lógica Top 5 Produtos Mais Vendidos via HashMap
  const productSalesMap = saleItems.reduce((acc: Record<number, { id: number; name: string; quantity: number }>, item: any) => {
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
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 5);

  // Lógica Real do Gráfico de Volume (Agregação por Dia da Semana: Seg a Dom)
  const chartData = useMemo(() => {
    // Índices do JS (0 = Dom, 1 = Seg ... 6 = Sáb)
    const rawTotals = [0, 0, 0, 0, 0, 0, 0];
    
    sales.forEach((sale: any) => {
      const day = new Date(sale.date).getDay();
      rawTotals[day] += Number(sale.total || 0);
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

  // Série diária para os sparklines dos cards de métrica (últimos 30 dias com venda)
  const dailySeries = useMemo(() => {
    const byDay = new Map<number, { rev: number; cnt: number }>();
    sales.forEach((s: any) => {
      const dt = new Date(s.date);
      const key = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
      const cur = byDay.get(key) || { rev: 0, cnt: 0 };
      cur.rev += Number(s.total || 0);
      cur.cnt += 1;
      byDay.set(key, cur);
    });
    const sorted = [...byDay.entries()].sort((a, b) => a[0] - b[0]).slice(-30);
    return {
      revenue: sorted.map(e => e[1].rev),
      count: sorted.map(e => e[1].cnt),
    };
  }, [sales]);

  // Caminhos SVG (linha + área) do gráfico de volume semanal
  const volumePaths = useMemo(() => {
    const w = 280, h = 120;
    const vals = chartData.map(d => d.percent);
    if (vals.every(v => v === 0)) return { line: "", area: "" };
    const stepX = w / (vals.length - 1);
    const pts = vals.map((v, i) => [i * stepX, h - 3 - (v / 100) * (h - 6)]);
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${w},${h} L0,${h} Z`;
    return { line, area };
  }, [chartData]);

  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter'] px-4 py-8 pb-32">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-primary-bright font-black tracking-tighter text-2xl">Relatórios</h1>
      </header>
      
      {/* Resumo & Filtro Dinâmico */}
      <div className="relative mb-6">
        <div 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 bg-surface-raised w-max px-4 py-2 rounded-xl border border-border/50 shadow-sm active:scale-95 transition-transform cursor-pointer"
        >
          <span className="font-bold text-sm">
            {timeFilter === 'month' ? 'Este mês' : timeFilter === 'year' ? 'Este ano' : 'Sempre'}
          </span>
          <ChevronDown size={18} className={`text-primary transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
        </div>
        
        {isFilterOpen && (
          <>
            {/* Backdrop Layer */}
            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
            {/* Dropdown Card */}
            <div className="absolute top-12 left-0 w-40 bg-surface border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => { setTimeFilter('month'); setIsFilterOpen(false); }}
                className={`text-left px-4 py-3 text-sm font-bold transition-colors hover:bg-surface-raised ${timeFilter === 'month' ? 'text-primary-bright' : 'text-foreground'}`}
              >
                Este mês
              </button>
              <button 
                onClick={() => { setTimeFilter('year'); setIsFilterOpen(false); }}
                className={`text-left px-4 py-3 text-sm font-bold transition-colors hover:bg-surface-raised border-t border-border/30 ${timeFilter === 'year' ? 'text-primary-bright' : 'text-foreground'}`}
              >
                Este ano
              </button>
              <button 
                onClick={() => { setTimeFilter('all'); setIsFilterOpen(false); }}
                className={`text-left px-4 py-3 text-sm font-bold transition-colors hover:bg-surface-raised border-t border-border/30 ${timeFilter === 'all' ? 'text-primary-bright' : 'text-foreground'}`}
              >
                Sempre
              </button>
            </div>
          </>
        )}
      </div>

      {/* Cards de Métricas Estritos ao Design */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-surface rounded-2xl p-5 shadow-card flex flex-col">
          <p className="text-muted text-xs font-bold uppercase tracking-widest mb-2">Total Vendido</p>
          <p className="text-primary font-black text-2xl lg:text-3xl tracking-tighter truncate">{formatCurrency(totalVendido)}</p>
          <div className="text-primary mt-3"><Sparkline values={dailySeries.revenue} /></div>
        </div>
        <div className="bg-surface rounded-2xl p-5 shadow-card flex flex-col">
          <p className="text-muted text-xs font-bold uppercase tracking-widest mb-2">Nº de Vendas</p>
          <p className="text-foreground font-black text-2xl lg:text-3xl tracking-tighter">{numeroVendas}</p>
          <div className="text-primary-bright mt-3"><Sparkline values={dailySeries.count} /></div>
        </div>
      </div>

      {/* Gráfico de Volume Dinâmico */}
      <div className="bg-surface rounded-2xl p-5 shadow-card mb-8">
        <h2 className="text-muted text-xs font-bold uppercase tracking-widest mb-5">Volume de Vendas</h2>
        <div className="h-32 relative">
          {volumePaths.line ? (
            <svg viewBox="0 0 280 120" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={volumePaths.area} fill="url(#volFill)" />
              <path d={volumePaths.line} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-xs font-semibold">Sem vendas no período</div>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 text-[10px] text-muted font-bold px-1">
          <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
        </div>
      </div>

      {/* Seção Top 5 Rankings de Vendas Numéricas */}
      <div className="flex flex-col gap-3">
        <h2 className="text-muted text-xs font-bold uppercase tracking-widest mb-2 px-1">Top 5 Produtos Mais Vendidos</h2>
        <div className="flex flex-col bg-surface rounded-2xl overflow-hidden shadow-card">
          {top5Products.length > 0 ? (
            top5Products.map((product: any, index: number) => (
              <div key={product.id} className="flex items-center justify-between p-4 border-b border-border/20 last:border-0 hover:bg-surface-raised transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`font-black text-xl w-4 text-center ${index === 0 ? 'text-primary' : index === 1 ? 'text-primary-bright' : index === 2 ? 'text-foreground' : 'text-muted'}`}>{index + 1}</span>
                  <span className="font-semibold text-foreground tracking-tight">{product.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-foreground font-bold">{product.quantity}</span>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-widest">vendas</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted text-sm font-medium">Nenhuma venda faturada ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
