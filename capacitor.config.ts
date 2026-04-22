import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c9c7af010da54a22a51eb40ca37bcbd2',
  appName: 'ratioai',
  webDir: 'dist',
  server: {
    url: 'https://c9c7af01-0da5-4a22-a51e-b40ca37bcbd2.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
