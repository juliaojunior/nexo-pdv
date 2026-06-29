"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { useCartStore } from "@/stores/cart.store";
import { flushPendingSales } from "@/lib/offline/syncManager";
import { db } from "@/db/db";

// Migração única dos clientes locais (Dexie) para a nuvem, preservando o id.
// Online-only: se falhar/offline, não marca a flag e tenta de novo no próximo load.
// NÃO apaga os clientes locais — só para de lê-los após a migração (o app já lê da API).
async function migrateCustomersOnce() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("customersMigratedV1")) return;
  if (!navigator.onLine) return;

  try {
    const local = await db.customers.toArray();
    if (local.length === 0) {
      localStorage.setItem("customersMigratedV1", "1");
      return;
    }
    const res = await fetch("/api/customers/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        local.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          document: c.document,
          createdAt: c.createdAt,
        }))
      ),
    });
    if (res.ok) {
      localStorage.setItem("customersMigratedV1", "1");
      mutate("/api/customers"); // revalida quem já está lendo a lista
    }
  } catch {
    // sem rede / sessão: tenta no próximo carregamento
  }
}

// Componente invisível montado no layout: religa o carrinho persistido,
// descarrega a fila de vendas offline e migra os clientes para a nuvem (1x).
export function SyncProvider() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    flushPendingSales();
    migrateCustomersOnce();

    const onOnline = () => {
      flushPendingSales();
      migrateCustomersOnce();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
