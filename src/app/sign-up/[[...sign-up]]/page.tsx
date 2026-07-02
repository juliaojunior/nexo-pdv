"use client";

// Cadastro sem senha: mesmo fluxo de e-mail + código do login (ver sign-in/page.tsx).
// Não usa o <SignUp/> pronto do Clerk de propósito — ele injeta automaticamente
// o botão "Continuar com Google" com base na config do dashboard, e este app
// só oferece e-mail + código.
import { useEffect, useState } from "react";
import { ClerkLoaded, ClerkLoading, useAuth } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const clerkErrMsg = (err: unknown, fallback: string): string => {
  const e = err as { errors?: Array<{ message?: string }> };
  return e?.errors?.[0]?.message || fallback;
};

export default function Page() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Já logado (ex.: sessão sobrevivente de voltar no histórico do navegador
  // para esta tela) — manda pra home em vez de deixar tentar cadastrar de
  // novo e travar num erro "session already exists" do Clerk.
  useEffect(() => {
    if (authLoaded && isSignedIn) router.replace("/");
  }, [authLoaded, isSignedIn, router]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    if (!email) return toast.error("Digite seu e-mail.");

    setLoading(true);
    try {
      await signUp.create({ emailAddress: email });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
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
    if (!isLoaded || !signUp) return;
    if (!code) return toast.error("Digite o código recebido.");

    setLoading(true);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        // replace (não push): "voltar" no navegador não deve reabrir o cadastro
        // já autenticado — é a origem do trava "session already exists".
        router.replace("/");
      } else {
        toast.error("Não foi possível concluir o cadastro.");
      }
    } catch (err) {
      toast.error(clerkErrMsg(err, "Código incorreto ou expirado."));
    } finally {
      setLoading(false);
    }
  };

  if (authLoaded && isSignedIn) return null; // evita piscar o form enquanto redireciona

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-black text-primary-bright tracking-tighter mb-2">Nexo PDV</h1>
          <p className="text-muted text-sm">
            {codeSent ? "Digite o código que enviamos." : "Crie sua Conta Lojista Grátis"}
          </p>
        </div>

        <ClerkLoading>
          <div className="w-full h-12 bg-surface-raised/40 text-muted flex items-center justify-center rounded-xl font-bold text-sm opacity-50">
            Carregando...
          </div>
        </ClerkLoading>

        <ClerkLoaded>
          <div className="w-full bg-surface border border-border/30 shadow-2xl rounded-2xl p-6 flex flex-col gap-3">
            {!codeSent && (
              <>
                <form onSubmit={handleSendCode} className="flex flex-col gap-3">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail"
                    className="w-full bg-surface-raised border border-border/50 focus:border-primary-bright rounded-xl h-12 px-4 text-foreground text-sm font-medium outline-none transition-colors placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-primary-bright hover:bg-primary text-background flex items-center justify-center rounded-xl font-bold uppercase tracking-wide text-sm transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {loading ? "Enviando..." : "Receber código por e-mail"}
                  </button>
                </form>

                <p className="text-center text-muted text-xs">
                  Já tem conta?{" "}
                  <Link href="/sign-in" className="text-primary-bright font-bold hover:underline">
                    Entrar
                  </Link>
                </p>
              </>
            )}

            {codeSent && (
              <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
                <p className="text-muted text-xs text-center">
                  Código enviado para <span className="text-foreground font-bold">{email}</span>.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Código de 6 dígitos"
                  className="w-full bg-surface-raised border border-border/50 focus:border-primary-bright rounded-xl h-12 px-4 text-foreground text-center text-lg font-black tracking-[0.3em] outline-none transition-colors placeholder:text-muted placeholder:tracking-normal placeholder:font-medium placeholder:text-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary-bright hover:bg-primary text-background flex items-center justify-center rounded-xl font-bold uppercase tracking-wide text-sm transition-transform active:scale-95 disabled:opacity-50"
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
    </div>
  );
}
