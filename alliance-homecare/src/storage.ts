import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  DEFAULT_PIN,
  DEFAULT_PROFILE,
  DEFAULT_SMS_TEMPLATE,
  DEFAULT_TARGET_NUMBER,
  MedicalProfile,
} from './config';

const KEYS = {
  profile: 'alliance.profile.v1',
  target: 'alliance.target.v1',
  sms: 'alliance.sms.v1',
  pin: 'alliance_pin_v1',
};

export type StoredState = {
  profile: MedicalProfile;
  targetNumber: string;
  smsTemplate: string;
};

export async function loadState(): Promise<StoredState> {
  try {
    const [profile, target, sms] = await AsyncStorage.multiGet([KEYS.profile, KEYS.target, KEYS.sms]);
    return {
      profile: profile[1] ? { ...DEFAULT_PROFILE, ...JSON.parse(profile[1]) } : DEFAULT_PROFILE,
      targetNumber: target[1] || DEFAULT_TARGET_NUMBER,
      smsTemplate: sms[1] || DEFAULT_SMS_TEMPLATE,
    };
  } catch {
    return { profile: DEFAULT_PROFILE, targetNumber: DEFAULT_TARGET_NUMBER, smsTemplate: DEFAULT_SMS_TEMPLATE };
  }
}

export function saveProfile(profile: MedicalProfile) {
  return AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile)).catch(() => {});
}

export function saveTargetNumber(value: string) {
  return AsyncStorage.setItem(KEYS.target, value).catch(() => {});
}

export function saveSmsTemplate(value: string) {
  return AsyncStorage.setItem(KEYS.sms, value).catch(() => {});
}

export async function getPin(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(KEYS.pin)) || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setPin(pin: string) {
  return SecureStore.setItemAsync(KEYS.pin, pin);
}
