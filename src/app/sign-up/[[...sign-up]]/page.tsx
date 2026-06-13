import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-black text-primary-bright tracking-tighter mb-2">Nexo PDV</h1>
          <p className="text-muted text-sm">Crie sua Conta Lojista Grátis</p>
        </div>
        <SignUp forceRedirectUrl="/" appearance={{
          elements: {
            card: "bg-surface border border-border/30 shadow-2xl rounded-2xl",
            headerTitle: "text-foreground font-bold",
            headerSubtitle: "text-muted",
            socialButtonsBlockButton: "border border-border/50 text-foreground hover:bg-surface-raised",
            socialButtonsBlockButtonText: "text-foreground font-medium",
            dividerLine: "bg-border/50",
            dividerText: "text-muted",
            formFieldLabel: "text-muted",
            formFieldInput: "bg-surface-raised border-border/50 text-foreground focus:border-primary-bright rounded-xl",
            formButtonPrimary: "bg-primary-bright hover:bg-primary text-background font-bold rounded-xl",
            footerActionText: "text-muted",
            footerActionLink: "text-primary-bright hover:text-primary",
          }
        }} />
      </div>
    </div>
  );
}
