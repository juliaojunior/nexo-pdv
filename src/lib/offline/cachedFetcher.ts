import { db } from "@/db/db";

// GETs que podem ser servidos do cache local quando a rede falhar
const CACHEABLE = new Set(["/api/products", "/api/categories"]);

// Erro HTTP do servidor: a rede funcionou, então NUNCA serve cache nem enfileira
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Retorna `any` de propósito: drop-in do fetcher anterior (o SWR infere o tipo do fetcher,
// e um genérico aqui colapsaria para `{}` nas páginas existentes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cachedFetcher(url: string): Promise<any> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.error ?? `Erro ${res.status}`);
    }
    const data = await res.json();
    if (CACHEABLE.has(url)) {
      await db.apiCache.put({ url, data, updatedAt: Date.now() });
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Falha de rede (fetch rejeitou): tenta o cache local
    if (CACHEABLE.has(url)) {
      const hit = await db.apiCache.get(url);
      if (hit) return hit.data;
    }
    throw err;
  }
}

interface CachedProductRow {
  id: number;
  stock: number;
  [key: string]: unknown;
}

// Mantém o estoque do cache coerente após uma venda feita offline
export async function decrementCachedStock(
  items: { productId: number; quantity: number }[]
): Promise<void> {
  const hit = await db.apiCache.get("/api/products");
  if (!hit || !Array.isArray(hit.data)) return;

  const byId = new Map(items.map((i) => [i.productId, i.quantity]));
  const next = (hit.data as CachedProductRow[]).map((row) => {
    const sold = byId.get(row.id);
    if (!sold) return row;
    return { ...row, stock: Math.max(0, row.stock - sold) };
  });

  await db.apiCache.put({ url: "/api/products", data: next, updatedAt: hit.updatedAt });
}
