"use client";

import { useClerk, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

export default function Page() {
  const clerk = useClerk();

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

  return (
    <div className="flex flex-col min-h-screen selection:bg-[#53ddfc] selection:text-[#004b58] overflow-hidden bg-[#0e0e0e] font-['Inter']">
      <main className="flex-grow flex items-center justify-center relative p-6 pb-20">
        
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#53ddfc]/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#74a2ff]/10 blur-[100px] rounded-full"></div>
        </div>
        
        <section className="z-10 w-full max-w-md">
          <div className="bg-[#131313] rounded-xl p-10 flex flex-col items-center space-y-10 shadow-[0_32px_32px_rgba(83,221,252,0.08)]">
            
            {/* Brand Anchor */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#53ddfc] to-[#21bedc] rounded-xl flex items-center justify-center shadow-lg shadow-[#53ddfc]/20">
                <span className="material-symbols-outlined text-[#004b58] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tighter text-[#53ddfc]">Nexo PDV</h1>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-white">Simplifique sua gestão.</h2>
              <p className="text-[#adaaaa] text-sm tracking-wide">Faça login para continuar.</p>
            </div>

            {/* DIRECT GOOGLE OAUTH BUTTON (No Clerk Default UI) */}
            <div className="w-full flex flex-col items-center justify-center min-h-[56px]">
              <ClerkLoading>
                 <button 
                  disabled
                  className="w-full h-14 bg-white/20 text-[#adaaaa] flex items-center justify-center gap-4 rounded-lg font-bold text-base cursor-not-allowed opacity-50"
                 >
                   <svg className="w-6 h-6 animate-spin text-[#adaaaa]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                   Carregando Motor...
                 </button>
              </ClerkLoading>
              <ClerkLoaded>
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full h-14 bg-white text-[#121212] flex items-center justify-center gap-4 rounded-lg font-bold text-base transition-[all_0.2s_ease-out] active:scale-95 hover:bg-gray-200 shadow-md transform-gpu"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
                  </svg>
                  Continuar com Google
                </button>
              </ClerkLoaded>
            </div>

            {/* App Statistics / Bento Style Sub-component */}
            <div className="grid grid-cols-2 gap-4 w-full mt-2">
              <div className="bg-[#20201f] p-4 rounded-xl border border-[#484847]/20">
                <div className="text-[#53ddfc] text-[10px] font-black uppercase tracking-widest mb-1">Agilidade</div>
                <div className="text-white font-bold text-sm">Vendas em 1-tap</div>
              </div>
              <div className="bg-[#20201f] p-4 rounded-xl border border-[#484847]/20">
                <div className="text-[#01cbff] text-[10px] font-black uppercase tracking-widest mb-1">Estoque</div>
                <div className="text-white font-bold text-sm">Gestão Smart</div>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Footer Content */}
      <footer className="fixed bottom-6 w-full flex flex-col items-center gap-3 px-4 z-20">
        <div className="flex items-center gap-5">
          <a className="font-['Inter'] text-[10px] uppercase tracking-widest text-[#adaaaa] hover:text-[#53ddfc] transition-colors cursor-pointer" href="#">Termos de Uso</a>
          <div className="w-[3px] h-[3px] rounded-full bg-[#484847]"></div>
          <a className="font-['Inter'] text-[10px] uppercase tracking-widest text-[#adaaaa] hover:text-[#53ddfc] transition-colors cursor-pointer" href="#">Privacidade</a>
        </div>
        <p className="font-['Inter'] text-[9px] uppercase tracking-widest text-[#adaaaa] opacity-40">© 2026 Nexo PDV. All rights reserved.</p>
      </footer>

      {/* Background Layer (The Canvas) */}
      <div className="fixed inset-0 -z-20 bg-[#0e0e0e]"></div>
      
      {/* Abstract Texture */}
      <div className="fixed top-0 right-0 w-[40%] md:w-1/3 h-full -z-10 opacity-10 pointer-events-none mix-blend-color-dodge">
        <div className="absolute inset-0 bg-gradient-to-l from-[#53ddfc]/10 to-transparent"></div>
        <img 
          alt="tech texture overlay" 
          className="w-full h-full object-cover grayscale" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA27A0fBRDNjJXWuaiRIizct7JvWPCi1I_FoNy0MGCxJYXu5Ux8T_eQPmBgWfNp0wgJDfPWU-Iew0RR778Q9PyeK9vttOIefCahL9gaK72gh1jaYNuooqW6KgIYj3bm-_DwvhIh30hsfKvOhtFsYj309nvoAFZHdI3yieQjsEzIkHHnelfgdtx11wVNCVSif3gRozvyOT25Gsp0Dr2ZEvwL-DIi80oAwuagEq9HF-zIj8CJZeIJRnpI6-lTHKUetAJN4LgwxlYJyv3a"
        />
      </div>
    </div>
  );
}
