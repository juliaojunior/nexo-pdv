import { db, type SalePayload } from "@/db/db";
import { ApiError, decrementCachedStock } from "./cachedFetcher";

export type SubmitResult =
  | { status: "synced"; saleId: number }
  | { status: "queued" };

// Envia a venda; sem rede, enfileira para sincronização posterior.
// Erros HTTP (validação, 401, 409, 500) NUNCA enfileiram — a rede funcionou,
// o servidor recusou, e re-enviar produziria o mesmo erro.
export async function submitSale(
  payload: SalePayload,
  customerName?: string
): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Falha de rede: registra na fila e ajusta o estoque do cache local
    await db.pendingSales.add({
      clientId: payload.clientId,
      payload,
      customerName,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: "pending",
    });
    await decrementCachedStock(payload.items);
    return { status: "queued" };
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Erro ${res.status}`);
  }
  return { status: "synced", saleId: body.id };
}
