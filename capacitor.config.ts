import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fetihb.app',
  appName: 'fetih',
  webDir: 'dist',
  server: {
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false // Bu ayar iOS'da ekranın bir web sitesi gibi yukarı aşağı sekmesini engelleyip Native uygulama hissi verir.
  }
};

export default config;
