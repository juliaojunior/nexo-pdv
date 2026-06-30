import type { Metadata } from "next";
import Link from "next/link";
import {
  Notebook, EyeOff, LayoutGrid, Brain,
  Layers, Wallet, TrendingUp, Zap, Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Nexo PDV — Suas vendas de revenda, organizadas",
  description:
    "Controle o fiado, o lucro e o estoque de todas as marcas que você vende — num lugar só, no seu celular.",
  openGraph: {
    url: "/comecar",
  },
};

const dores = [
  { icon: Notebook, title: "O fiado vira bagunça", desc: "Quem deve o quê some no meio dos rabiscos." },
  { icon: EyeOff, title: "O lucro fica no escuro", desc: "Vende muito, mas não sabe quanto sobra." },
  { icon: LayoutGrid, title: "Cada marca num canto", desc: "Um app pra Natura, outro pra Avon, planilha pro resto." },
  { icon: Brain, title: "Tudo na memória", desc: "Estoque e contas só na cabeça — até esquecer." },
];

const recursos = [
  {
    icon: Layers,
    title: "Todas as marcas juntas",
    desc: "Lucro e a receber numa tela só. Só o Nexo faz.",
    destaque: true,
  },
  { icon: Wallet, title: "Fiado sob controle", desc: "Parcelas com data e contas a receber por cliente." },
  { icon: TrendingUp, title: "Lucro de verdade", desc: "Custo congelado em cada venda — o lucro certo, sempre." },
  { icon: Zap, title: "Rápido e funciona offline", desc: "Vendeu sem sinal? Sincroniza sozinho depois." },
];

const faq = [
  { q: "Preciso de CNPJ?", a: "Não. É só baixar e começar a usar — feito para revendedoras autônomas." },
  { q: "Funciona sem internet?", a: "Sim. Você vende offline e o app sincroniza assim que a conexão voltar." },
  { q: "Dá pra usar várias marcas?", a: "Sim — esse é o ponto. Natura, Avon, Boticário, Eudora e o que mais você vender, juntas." },
  { q: "E os dados dos meus clientes?", a: "São seus. Ficam seguros na nuvem e acessíveis só pela sua conta." },
];

function CTA({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/sign-up"
      className="inline-flex items-center justify-center bg-primary text-primary-deep font-black text-base uppercase tracking-wide px-7 py-4 rounded-xl shadow-glow active:scale-95 transition-transform"
    >
      {children}
    </Link>
  );
}

export default function ComecarPage() {
  return (
    <div className="bg-background min-h-screen text-foreground font-['Inter']">
      {/* Topo */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-primary-bright font-black tracking-tighter text-xl">Nexo PDV</span>
          <Link
            href="/sign-up"
            className="bg-primary text-primary-deep font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            Criar conta grátis
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4">
        {/* Hero */}
        <section className="pt-12 pb-14 text-center flex flex-col items-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary-bright bg-primary-deep/10 px-3 py-1.5 rounded-full">
            Para quem revende Natura, Avon, Boticário, Eudora…
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tighter leading-[1.1]">
            Suas vendas saíram do caderno. Agora ficam organizadas.
          </h1>
          <p className="mt-4 text-muted text-base leading-relaxed">
            Controle o fiado, o lucro e o estoque de todas as marcas que você vende — num lugar só, no seu celular.
          </p>
          <div className="mt-7">
            <CTA>Criar conta grátis</CTA>
          </div>
          <p className="mt-3 text-muted text-xs font-medium">
            Grátis de verdade nos 6 primeiros meses. Sem cartão para começar.
          </p>
        </section>

        {/* Dor */}
        <section className="py-10">
          <h2 className="text-2xl font-black tracking-tight text-center leading-snug">
            Vender é fácil. Saber se sobrou dinheiro é que é difícil.
          </h2>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {dores.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-surface rounded-2xl p-4 shadow-card flex flex-col gap-2">
                <div className="bg-surface-raised w-10 h-10 rounded-xl flex items-center justify-center text-danger">
                  <Icon size={20} />
                </div>
                <span className="font-bold text-sm leading-tight">{title}</span>
                <span className="text-muted text-xs leading-snug">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recursos */}
        <section className="py-10">
          <h2 className="text-2xl font-black tracking-tight text-center mb-7">O que o Nexo resolve</h2>
          <div className="flex flex-col gap-3">
            {recursos.map(({ icon: Icon, title, desc, destaque }) => (
              <div
                key={title}
                className={`rounded-2xl p-4 flex items-start gap-3 ${
                  destaque
                    ? "bg-primary-deep/10 border border-primary/30 shadow-glow"
                    : "bg-surface shadow-card"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${destaque ? "bg-primary text-primary-deep" : "bg-surface-raised text-primary-bright"}`}>
                  <Icon size={22} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base leading-tight">{title}</span>
                  <span className="text-muted text-sm leading-snug mt-0.5">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Oferta */}
        <section className="py-10">
          <div className="bg-surface rounded-3xl p-7 shadow-overlay border border-border/30 text-center flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary-bright">A oferta</span>
            <h2 className="mt-2 text-3xl font-black tracking-tighter">Grátis nos 6 primeiros meses</h2>
            <p className="mt-3 text-muted text-sm leading-relaxed">
              Depois, escolha: plano <strong className="text-foreground">grátis para sempre</strong> ou{" "}
              <strong className="text-foreground">Premium por R$ 19/mês</strong>. Sem fidelidade — cancela quando quiser.
            </p>
            <div className="mt-6">
              <CTA>Criar minha conta grátis</CTA>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-10">
          <h2 className="text-2xl font-black tracking-tight text-center mb-6">Perguntas frequentes</h2>
          <div className="flex flex-col gap-3">
            {faq.map(({ q, a }) => (
              <div key={q} className="bg-surface rounded-2xl p-4 shadow-card">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Check size={16} className="text-primary-bright shrink-0" /> {q}
                </div>
                <p className="text-muted text-sm leading-relaxed mt-2 pl-6">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Rodapé + aviso de não-afiliação */}
      <footer className="border-t border-border/30 mt-6">
        <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-4">
          <p className="text-muted text-[11px] leading-relaxed">
            Nexo PDV é um aplicativo independente de gestão de vendas. Não possui vínculo, parceria ou
            patrocínio de Natura, Avon, O Boticário, Eudora ou de qualquer outra marca citada. As marcas
            pertencem a seus respectivos titulares e são mencionadas apenas de forma descritiva.
          </p>
          <div className="flex items-center gap-4 text-xs font-bold">
            <Link href="/privacidade" className="text-muted hover:text-primary-bright transition-colors">Privacidade</Link>
            <Link href="/termos" className="text-muted hover:text-primary-bright transition-colors">Termos</Link>
          </div>
          <span className="text-muted/60 text-[10px] font-bold uppercase tracking-widest">Nexo PDV</span>
        </div>
      </footer>
    </div>
  );
}
