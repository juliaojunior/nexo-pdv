import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.nexopdv',
  appName: 'Nexo PDV',
  // webDir não é usado para empacotar (carregamos a Vercel via server.url),
  // mas o Capacitor exige um diretório existente para `cap sync`.
  webDir: 'public',
  server: {
    // App nativo é uma casca que carrega o site logado em produção.
    // Login (Clerk), API e catálogo rodam na mesma origem da Vercel.
    url: 'https://nexo-pdv.vercel.app',
    cleartext: false,
    // Mantém na própria WebView as navegações cross-origin do Clerk
    // (handshake de sessão no domínio *.clerk.accounts.dev) em vez de
    // chutar para o Chrome externo. Sem isso o app "abre no navegador".
    allowNavigation: [
      'nexo-pdv.vercel.app',
      'rational-gopher-23.clerk.accounts.dev',
      '*.clerk.accounts.dev',
    ],
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#16a34a',
    },
  },
};

export default config;
