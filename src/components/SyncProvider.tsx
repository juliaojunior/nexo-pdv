"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart.store";
import { flushPendingSales } from "@/lib/offline/syncManager";

// Componente invisível montado no layout: religa o carrinho persistido
// e descarrega a fila de vendas offline quando a conexão volta.
export function SyncProvider() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    flushPendingSales();

    const onOnline = () => flushPendingSales();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
