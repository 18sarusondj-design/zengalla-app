import { CapacitorConfig } from '@capacitor/cli';

const appRole = process.env.APP_ROLE || 'customer';

const config: CapacitorConfig = {
  appId: appRole === 'delivery' ? 'com.zengalla.delivery' : 'com.zengalla.customer',
  appName: appRole === 'delivery' ? 'Zengalla Delivery' : 'Zengalla Customer',
  webDir: 'dist',
  bundledWebRuntime: false
};

export default config;
