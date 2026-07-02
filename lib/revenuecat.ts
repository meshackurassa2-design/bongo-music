import Purchases, { LogLevel } from 'react-native-purchases';
import { Platform } from 'react-native';

// TODO: Replace with your actual public RevenueCat API keys
const API_KEYS = {
  android: 'goog_YOUR_REVENUECAT_ANDROID_KEY',
  ios: 'appl_YOUR_REVENUECAT_IOS_KEY',
};

export const initRevenueCat = async (appUserId?: string) => {
  if (Platform.OS === 'web') return; // RevenueCat does not support web directly here

  try {
    Purchases.setLogLevel(LogLevel.DEBUG);
    
    if (Platform.OS === 'android') {
      await Purchases.configure({ apiKey: API_KEYS.android, appUserID: appUserId });
    } else if (Platform.OS === 'ios') {
      await Purchases.configure({ apiKey: API_KEYS.ios, appUserID: appUserId });
    }
  } catch (error) {
    console.error('Error initializing RevenueCat', error);
  }
};

export const loginRevenueCat = async (appUserId: string) => {
  if (Platform.OS === 'web') return;
  try {
    await Purchases.logIn(appUserId);
  } catch (error) {
    console.error('Error logging in RevenueCat', error);
  }
};

export const logoutRevenueCat = async () => {
  if (Platform.OS === 'web') return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Error logging out RevenueCat', error);
  }
};
