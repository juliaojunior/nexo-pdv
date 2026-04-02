import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0e0e0e] items-center justify-center">
      <div className="w-16 h-16 border-4 border-[#53ddfc] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[#53ddfc] mt-4 font-['Inter'] font-semibold">Autenticando Conta Google...</p>
      <AuthenticateWithRedirectCallback continueSignUpUrl="/" />
    </div>
  );
}
