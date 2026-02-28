import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fetihb.app',
  appName: 'fetih',
  webDir: 'dist',
  server: {
    cleartext: true
  }
};

export default config;
