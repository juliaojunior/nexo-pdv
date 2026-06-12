import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center">
      <div className="w-16 h-16 border-4 border-primary-bright border-t-transparent rounded-full animate-spin"></div>
      <p className="text-primary-bright mt-4 font-['Inter'] font-semibold">Autenticando Conta Google...</p>
      <AuthenticateWithRedirectCallback continueSignUpUrl="/" />
    </div>
  );
}
