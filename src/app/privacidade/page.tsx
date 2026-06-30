import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade — Nexo PDV",
  description: "Como o Nexo PDV trata seus dados e os dos seus clientes.",
};

export default function PrivacidadePage() {
  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter']">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/comecar" className="p-2 -ml-2 rounded-full bg-surface-raised text-muted hover:text-primary-bright transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <h1 className="font-black tracking-tight text-lg">Política de Privacidade</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center gap-2 bg-warning/15 text-warning border border-warning/30 rounded-xl px-4 py-3 text-sm font-bold">
          <AlertTriangle size={18} className="shrink-0" />
          Rascunho — revisão jurídica pendente
        </div>

        <p className="text-muted text-sm leading-relaxed">
          O Nexo PDV coleta apenas os dados necessários para funcionar: sua conta de acesso e os
          registros que você cria (produtos, vendas, clientes). Esses dados são seus e ficam
          armazenados de forma segura na nuvem, acessíveis somente pela sua conta.
        </p>
        <p className="text-muted text-sm leading-relaxed">
          Não vendemos nem compartilhamos seus dados ou os de seus clientes com terceiros para fins
          de marketing. Você pode solicitar a exclusão da sua conta e dos dados associados a qualquer momento.
        </p>
        <p className="text-muted text-sm leading-relaxed">
          Esta é uma versão inicial. O texto definitivo, em conformidade com a LGPD, será publicado
          após revisão jurídica.
        </p>
      </main>
    </div>
  );
}
