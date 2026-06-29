"use client";

import { useLiveQuery } from "dexie-react-hooks";
import useSWR from "swr";
import { db } from "@/db/db";
import { ChevronLeft, Wallet, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReceivablesPage() {
  const router = useRouter();
  const { data: rawSales, isLoading } = useSWR("/api/sales", fetcher, { revalidateOnFocus: true });
  const sales = rawSales || [];
  // Clientes são locais (Dexie); junta-se com as vendas (servidor) por customerId.
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Vendas fiado com saldo em aberto
  const open = sales
    .filter((s: any) => s.paymentMethod === "Fiado")
    .map((s: any) => ({ ...s, balance: Math.round((Number(s.total) - Number(s.amountPaid || 0)) * 100) / 100 }))
    .filter((s: any) => s.balance > 0.001);

  // Agrupa por cliente, soma os saldos
  const byCustomer = new Map<number, { customerId?: number; total: number; count: number }>();
  for (const s of open) {
    const key = s.customerId ?? 0;
    const cur = byCustomer.get(key) || { customerId: s.customerId, total: 0, count: 0 };
    cur.total += s.balance;
    cur.count += 1;
    byCustomer.set(key, cur);
  }
  const groups = [...byCustomer.values()]
    .map((g) => ({
      ...g,
      total: Math.round(g.total * 100) / 100,
      name: g.customerId ? customers.find((c) => c.id === g.customerId)?.name || "Cliente removido" : "Sem cliente",
    }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = Math.round(groups.reduce((s, g) => s + g.total, 0) * 100) / 100;

  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter'] relative w-full pb-32">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30 px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform bg-surface-raised text-muted hover:text-primary-bright">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-warning font-black tracking-tighter text-2xl">A Receber</h1>
            <span className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-1.5"><Wallet size={12} /> Fiado em aberto por cliente</span>
          </div>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-md mx-auto flex flex-col gap-4">
        {/* Total geral */}
        <div className="bg-surface rounded-2xl p-5 shadow-card border border-warning/20 flex flex-col items-center">
          <span className="text-muted text-xs font-bold uppercase tracking-widest">Total a Receber</span>
          <span className="text-warning font-black text-4xl tracking-tighter mt-1">{formatCurrency(grandTotal)}</span>
          <span className="text-muted text-[10px] font-bold uppercase tracking-widest mt-1">
            {groups.length} cliente{groups.length !== 1 ? "s" : ""} · {open.length} venda{open.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center mt-6 opacity-50">
            <div className="w-10 h-10 border-4 border-border border-t-warning animate-spin rounded-full mb-4" />
            <p className="font-bold text-foreground uppercase tracking-widest text-xs">Carregando dívidas...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[40vh] text-muted text-center border-2 border-dashed border-border/30 rounded-3xl p-6 bg-surface">
            <div className="bg-surface-raised p-4 rounded-full mb-4 shadow-inner">
              <Wallet size={28} className="text-border" />
            </div>
            <p className="font-bold text-foreground mb-2 text-lg tracking-tight">Ninguém te deve nada</p>
            <p className="text-xs leading-relaxed max-w-[220px]">Vendas fiado em aberto aparecem aqui, somadas por cliente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <div key={g.customerId ?? "none"} className="bg-surface rounded-2xl p-4 flex items-center justify-between shadow-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-warning/30 to-background border border-warning/30 flex items-center justify-center font-black text-sm text-warning shadow-inner shrink-0">
                    {g.customerId ? g.name.substring(0, 2).toUpperCase() : <User size={18} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground text-base tracking-tight truncate">{g.name}</span>
                    <span className="text-muted text-[10px] font-bold uppercase tracking-widest">{g.count} venda{g.count > 1 ? "s" : ""} em aberto</span>
                  </div>
                </div>
                <span className="text-warning font-black text-lg tracking-tight shrink-0 pl-2">{formatCurrency(g.total)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
