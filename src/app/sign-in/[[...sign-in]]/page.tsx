"use client";

import { useState, useSyncExternalStore } from "react";
import { useClerk, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
// API clássica de sign-in (create/prepareFirstFactor/attemptFirstFactor).
// O export padrão de @clerk/nextjs passou a ser a API nova de "signals".
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

// Detecção de plataforma sem mismatch de hidratação (server = web)
const emptySubscribe = () => () => {};

// Extrai a mensagem de erro do Clerk sem usar `any`
const clerkErrMsg = (err: unknown, fallback: string): string => {
  const e = err as { errors?: Array<{ message?: string }> };
  return e?.errors?.[0]?.message || fallback;
};

export default function Page() {
  const clerk = useClerk();
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // No app nativo o Google não funciona (Google bloqueia WebView) — esconder.
  const isNative = useSyncExternalStore(
    emptySubscribe,
    () => Capacitor.isNativePlatform(),
    () => false
  );

  const handleGoogleSignIn = () => {
    try {
       clerk.client.signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
       });
    } catch (e) {
      console.error("Erro OAuth: ", e, clerk);
    }
  };

  // Login sem senha: envia um código de 6 dígitos para o e-mail.
  // Funciona dentro da WebView do app nativo e para contas criadas pelo Google.
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
        router.push("/");
      } else {
        toast.error("Não foi possível concluir o login.");
      }
    } catch (err) {
      toast.error(clerkErrMsg(err, "Código incorreto ou expirado."));
    } finally {
      setLoading(false);
    }
  };

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

                    {/* Google: só na web. No app nativo o Google bloqueia WebView. */}
                    {!isNative && (
                      <>
                        <div className="flex items-center gap-3 my-1">
                          <div className="flex-1 h-px bg-border/40" />
                          <span className="text-muted text-[10px] uppercase tracking-widest">ou</span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>
                        <button
                          onClick={handleGoogleSignIn}
                          className="w-full h-12 bg-white text-[#1f1f1f] flex items-center justify-center gap-3 rounded-lg font-bold text-[13px] sm:text-base transition-transform active:scale-95 hover:bg-gray-200 shadow-md px-2"
                        >
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                          </svg>
                          Continuar com Google
                        </button>
                      </>
                    )}
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
