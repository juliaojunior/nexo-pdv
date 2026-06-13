import { mutate } from "swr";
import { toast } from "sonner";
import { db } from "@/db/db";

let flushing = false;

// Envia as vendas pendentes em ordem cronológica, uma a uma.
// Disparado no carregamento do app e no evento 'online' (SyncProvider).
export async function flushPendingSales(): Promise<void> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return;
  flushing = true;
  let sent = 0;

  try {
    const pending = (await db.pendingSales.toArray())
      .filter((p) => p.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const p of pending) {
      let res: Response;
      try {
        res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p.payload),
        });
      } catch {
        // Rede caiu de novo: para aqui; o próximo evento 'online' retoma
        await db.pendingSales.update(p.clientId, { attempts: p.attempts + 1 });
        break;
      }

      if (res.ok) {
        // Inclui respostas deduped — a venda já está no servidor
        await db.pendingSales.delete(p.clientId);
        sent++;
        continue;
      }

      if (res.status === 401) {
        // Sessão expirada: não é culpa da venda; retoma após novo login
        break;
      }

      if (res.status === 409 || res.status === 400) {
        // Falha permanente (ex.: estoque insuficiente) — marca para revisão, não re-tenta
        const body = await res.json().catch(() => null);
        await db.pendingSales.update(p.clientId, {
          status: "failed",
          lastError: body?.error ?? `Erro ${res.status}`,
          attempts: p.attempts + 1,
        });
        toast.error(
          `Venda pendente de ${p.customerName ?? "cliente"} foi rejeitada: ${body?.error ?? "erro de validação"}.`
        );
        continue;
      }

      // 5xx: transitório — tenta de novo no próximo flush
      await db.pendingSales.update(p.clientId, { attempts: p.attempts + 1 });
      break;
    }

    if (sent > 0) {
      await mutate("/api/products");
      await mutate("/api/sales");
      toast.success(
        sent === 1
          ? "1 venda feita offline foi sincronizada!"
          : `${sent} vendas feitas offline foram sincronizadas!`
      );
    }
  } finally {
    flushing = false;
  }
}
