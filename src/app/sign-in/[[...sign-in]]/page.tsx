"use client";

import { useEffect, useState } from "react";
import { ClerkLoaded, ClerkLoading, useAuth } from "@clerk/nextjs";
// API clássica de sign-in (create/prepareFirstFactor/attemptFirstFactor).
// O export padrão de @clerk/nextjs passou a ser a API nova de "signals".
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

// Extrai a mensagem de erro do Clerk sem usar `any`
const clerkErrMsg = (err: unknown, fallback: string): string => {
  const e = err as { errors?: Array<{ message?: string }> };
  return e?.errors?.[0]?.message || fallback;
};

export default function Page() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Já logado (ex.: sessão sobrevivente de voltar no histórico do navegador
  // para esta tela) — manda pra home em vez de deixar tentar logar de novo
  // e travar num erro "session already exists" do Clerk.
  useEffect(() => {
    if (authLoaded && isSignedIn) router.replace("/");
  }, [authLoaded, isSignedIn, router]);

  // Login sem senha: envia um código de 6 dígitos para o e-mail.
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    if (!email) return toast.error("Digite seu e-mail.");

    setLoading(true);
    try {
      const si = await signIn.create({ identifier: email });
      const factor = si.supportedFirstFactors?.find(f => f.strategy === "email_code");
      if (!factor || !("emailAddressId" in factor)) {
        toast.error("Login por código não está disponível para este e-mail.");
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      setCodeSent(true);
      toast.success("Código enviado para o seu e-mail.");
    } catch (err) {
      toast.error(clerkErrMsg(err, "Não foi possível enviar o código. Verifique o e-mail."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    if (!code) return toast.error("Digite o código recebido.");

    setLoading(true);
    try {
      const res = await signIn.attemptFirstFactor({ strategy: "email_code", code });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        // Recarga completa (não SPA): o <Show when="signed-in"> do layout usa a
        // API nova (signals) e não vê a sessão ativada pela API legacy sem
        // reload — sem isso a barra inferior não aparece até um F5.
        // location.replace também tira o login do histórico (evita o trava
        // "session already exists" ao voltar).
        window.location.replace("/");
      } else {
        toast.error("Não foi possível concluir o login.");
      }
    } catch (err) {
      toast.error(clerkErrMsg(err, "Código incorreto ou expirado."));
    } finally {
      setLoading(false);
    }
  };

  if (authLoaded && isSignedIn) return null; // evita piscar o form enquanto redireciona

  return (
    <div className="flex flex-col min-h-screen selection:bg-primary-bright selection:text-primary-deep overflow-hidden bg-background font-['Inter']">
      <main className="flex-grow flex items-center justify-center relative p-6 pb-20">

        <section className="z-10 w-full max-w-md">
          <div className="bg-background rounded-xl p-6 sm:p-10 flex flex-col items-center space-y-6 shadow-glow">

            {/* Brand Anchor */}
            <div className="flex flex-col items-center space-y-4">
              <img
                src="/icon.png"
                alt="Nexo PDV"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-lg shadow-primary-bright/20"
              />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-primary-bright">Nexo PDV</h1>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-2">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">Simplifique sua gestão.</h2>
              <p className="text-muted text-xs sm:text-sm tracking-wide">
                {codeSent ? "Digite o código que enviamos." : "Entre com seu e-mail para continuar."}
              </p>
            </div>

            <ClerkLoading>
               <div className="w-full h-12 sm:h-14 bg-surface-raised/40 text-muted flex items-center justify-center gap-3 rounded-lg font-bold text-sm opacity-50">
                 <svg className="w-5 h-5 animate-spin text-muted" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
                 Carregando...
               </div>
            </ClerkLoading>

            <ClerkLoaded>
              <div className="w-full flex flex-col gap-4">

                {!codeSent ? (
                  <>
                    {/* Etapa 1: e-mail → enviar código */}
                    <form onSubmit={handleSendCode} className="w-full flex flex-col gap-3">
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Seu e-mail"
                        className="w-full bg-surface-raised border border-border/50 focus:border-primary-bright rounded-lg h-12 px-4 text-foreground text-sm font-medium outline-none transition-colors placeholder:text-muted"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-primary text-primary-deep flex items-center justify-center rounded-lg font-black uppercase tracking-wide text-sm transition-transform active:scale-95 disabled:opacity-50 shadow-glow"
                      >
                        {loading ? "Enviando..." : "Receber código por e-mail"}
                      </button>
                    </form>

                    <p className="text-center text-muted text-xs">
                      Não tem conta?{" "}
                      <Link href="/sign-up" className="text-primary-bright font-bold hover:underline">
                        Criar conta
                      </Link>
                    </p>
                  </>
                ) : (
                  /* Etapa 2: verificar código */
                  <form onSubmit={handleVerifyCode} className="w-full flex flex-col gap-3">
                    <p className="text-muted text-xs text-center">Código enviado para <span className="text-foreground font-bold">{email}</span>.</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="Código de 6 dígitos"
                      className="w-full bg-surface-raised border border-border/50 focus:border-primary-bright rounded-lg h-12 px-4 text-foreground text-center text-lg font-black tracking-[0.3em] outline-none transition-colors placeholder:text-muted placeholder:tracking-normal placeholder:font-medium placeholder:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-primary text-primary-deep flex items-center justify-center rounded-lg font-black uppercase tracking-wide text-sm transition-transform active:scale-95 disabled:opacity-50 shadow-glow"
                    >
                      {loading ? "Verificando..." : "Confirmar código"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCodeSent(false); setCode(""); }}
                      className="text-muted text-xs font-bold tracking-wide hover:text-foreground"
                    >
                      Usar outro e-mail
                    </button>
                  </form>
                )}
              </div>
            </ClerkLoaded>

          </div>
        </section>
      </main>

      {/* Footer Content */}
      <footer className="fixed bottom-6 w-full flex flex-col items-center gap-3 px-4 z-20">
        <div className="flex items-center gap-5">
          <a className="font-['Inter'] text-[10px] uppercase tracking-widest text-muted hover:text-primary-bright transition-colors cursor-pointer" href="#">Termos de Uso</a>
          <div className="w-[3px] h-[3px] rounded-full bg-border"></div>
          <a className="font-['Inter'] text-[10px] uppercase tracking-widest text-muted hover:text-primary-bright transition-colors cursor-pointer" href="#">Privacidade</a>
        </div>
        <p className="font-['Inter'] text-[10px] uppercase tracking-widest text-muted opacity-40">© 2026 Nexo PDV. All rights reserved.</p>
      </footer>

      <div className="fixed inset-0 -z-20 bg-background"></div>
    </div>
  );
}
