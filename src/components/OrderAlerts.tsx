"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { fireOrderNotification } from "@/lib/notifications";

interface PendingOrder {
  id: number;
  customer_name: string;
  total_price: number | string;
}

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : { orders: [] }));

const ALERTS_KEY = "nexo_orderAlerts";
export const ORDER_ALERTS_EVENT = "nexo-order-alerts-changed";

/** Lê a preferência do toggle. Padrão: ligado. */
function alertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ALERTS_KEY) !== "false";
}

// Assina mudanças do toggle (evento da tela de Configurações + outras abas)
function subscribeToToggle(callback: () => void) {
  window.addEventListener(ORDER_ALERTS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ORDER_ALERTS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Vigia global de pedidos novos. Montado no layout, roda em qualquer tela
 * enquanto o lojista está logado e o alerta está ligado. Dispara notificação
 * nativa (Capacitor) ou web + som quando chega um pedido que não existia.
 */
export default function OrderAlerts() {
  const { isSignedIn } = useAuth();
  const enabled = useSyncExternalStore(subscribeToToggle, alertsEnabled, () => false);

  const active = Boolean(isSignedIn) && enabled;

  const { data } = useSWR<{ orders: PendingOrder[] }>(
    active ? "/api/orders?status=PENDING" : null,
    fetcher,
    { refreshInterval: 20000, revalidateOnFocus: true }
  );

  // IDs já vistos. A primeira resposta vira baseline (não notifica pedidos
  // que já estavam pendentes quando o app abriu).
  const seenIds = useRef<Set<number>>(new Set());
  const baselined = useRef(false);

  // Reinicia o baseline quando o vigia liga/desliga ou troca de sessão
  useEffect(() => {
    if (!active) {
      baselined.current = false;
      seenIds.current = new Set();
    }
  }, [active]);

  useEffect(() => {
    if (!active || !data?.orders) return;

    const orders = data.orders;

    if (!baselined.current) {
      seenIds.current = new Set(orders.map((o) => o.id));
      baselined.current = true;
      return;
    }

    const novos = orders.filter((o) => !seenIds.current.has(o.id));
    if (novos.length === 0) return;

    novos.forEach((o) => seenIds.current.add(o.id));

    const total = novos.reduce((acc, o) => acc + Number(o.total_price || 0), 0);
    const titulo = novos.length === 1 ? "Novo pedido recebido! 🛍️" : `${novos.length} novos pedidos! 🛍️`;
    const corpo =
      novos.length === 1
        ? `${novos[0].customer_name} — R$ ${Number(novos[0].total_price).toFixed(2).replace(".", ",")}`
        : `Total: R$ ${total.toFixed(2).replace(".", ",")}`;

    fireOrderNotification(titulo, corpo);
    toast.success(titulo, { description: corpo });
  }, [data, active]);

  return null;
}
