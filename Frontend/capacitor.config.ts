import { CapacitorConfig } from '@capacitor/cli';

const appRole = process.env.APP_ROLE || 'customer';

const config: CapacitorConfig = {
  appId: appRole === 'delivery' ? 'com.grozy.delivery' : 'com.grozy.customer',
  appName: appRole === 'delivery' ? 'Grozy Delivery' : 'Grozy Customer',
  webDir: 'dist',
  bundledWebRuntime: false
};

export default config;
