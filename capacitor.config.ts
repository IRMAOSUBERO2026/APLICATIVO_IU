import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.de7d3ddc9dba4ab589829d22b3bb9e4e',
  appName: 'iuengenharia',
  webDir: 'dist',
  // Hot-reload direto do sandbox durante o desenvolvimento.
  // Para gerar o APK/AAB de produção da Play Store, troque a url por
  // 'https://iuengenharia.lovable.app' (ou remova o bloco "server"
  // inteiro para usar o build local em dist/).
  server: {
    url: 'https://de7d3ddc-9dba-4ab5-8982-9d22b3bb9e4e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
