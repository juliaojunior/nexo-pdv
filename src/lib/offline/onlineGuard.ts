import { toast } from "sonner";

// Cadastros e edições continuam online-only por decisão de escopo:
// apenas VENDAS têm fila offline. Esta guarda dá a mensagem clara.
export function requireOnline(): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    toast.error("Você está offline. Cadastros e edições exigem conexão — as vendas continuam funcionando.");
    return false;
  }
  return true;
}
