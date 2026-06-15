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
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#16a34a',
    },
  },
};

export default config;
