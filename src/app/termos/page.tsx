import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso — Nexo PDV",
  description: "Os termos para usar o Nexo PDV.",
};

export default function TermosPage() {
  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter']">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/comecar" className="p-2 -ml-2 rounded-full bg-surface-raised text-muted hover:text-primary-bright transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <h1 className="font-black tracking-tight text-lg">Termos de Uso</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center gap-2 bg-warning/15 text-warning border border-warning/30 rounded-xl px-4 py-3 text-sm font-bold">
          <AlertTriangle size={18} className="shrink-0" />
          Rascunho — revisão jurídica pendente
        </div>

        <p className="text-muted text-sm leading-relaxed">
          O Nexo PDV é um aplicativo independente de gestão de vendas, oferecido para ajudar
          revendedoras a organizar fiado, lucro e estoque. Ao criar uma conta, você concorda em usar
          o app de forma lícita e é responsável pelas informações que cadastra.
        </p>
        <p className="text-muted text-sm leading-relaxed">
          O Nexo PDV não possui vínculo, parceria ou patrocínio de Natura, Avon, O Boticário, Eudora
          ou de qualquer outra marca. As marcas pertencem a seus respectivos titulares e são citadas
          apenas de forma descritiva.
        </p>
        <p className="text-muted text-sm leading-relaxed">
          O serviço é oferecido &quot;como está&quot;, em evolução contínua. Esta é uma versão inicial; os
          termos definitivos serão publicados após revisão jurídica.
        </p>
      </main>
    </div>
  );
}
