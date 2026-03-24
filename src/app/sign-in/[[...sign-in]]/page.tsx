import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-black text-[#53ddfc] tracking-tighter mb-2">Nexo PDV</h1>
          <p className="text-[#adaaaa] text-sm">Painel Administrativo na Nuvem</p>
        </div>
        <SignIn appearance={{
          elements: {
            card: "bg-[#1a1a1a] border border-[#484847]/30 shadow-2xl rounded-2xl",
            headerTitle: "text-white font-bold",
            headerSubtitle: "text-[#adaaaa]",
            socialButtonsBlockButton: "border border-[#484847]/50 text-white hover:bg-[#20201f]",
            socialButtonsBlockButtonText: "text-white font-medium",
            dividerLine: "bg-[#484847]/50",
            dividerText: "text-[#adaaaa]",
            formFieldLabel: "text-[#adaaaa]",
            formFieldInput: "bg-[#20201f] border-[#484847]/50 text-white focus:border-[#53ddfc] rounded-xl",
            formButtonPrimary: "bg-[#53ddfc] hover:bg-[#06B6D4] text-[#121212] font-bold rounded-xl",
            footerActionText: "text-[#adaaaa]",
            footerActionLink: "text-[#53ddfc] hover:text-[#06B6D4]",
          }
        }} />
      </div>
    </div>
  );
}
