import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import * as Speech from 'expo-speech';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';

import { EmergencyButton } from './src/components/EmergencyButton';
import { HealthIdView } from './src/components/HealthIdView';
import { Sheet } from './src/components/Sheet';
import {
  CALL_COUNTDOWN_SECONDS,
  DEFAULT_PROFILE,
  DEFAULT_SMS_TEMPLATE,
  DEFAULT_TARGET_NUMBER,
  INACTIVITY_MS,
  MedicalProfile,
  VERIFIED_LOCATION,
} from './src/config';
import { getPin, loadState, saveProfile, saveSmsTemplate, saveTargetNumber, setPin } from './src/storage';
import { colors, fonts } from './src/theme';

type Tab = 'dialer' | 'health';
type Panel = null | 'sms' | 'voice' | 'pin' | 'changePin';
type Coords = { latitude: number; longitude: number; accuracy: number | null };

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_900Black });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  return (
    <SafeAreaProvider>
      <AllianceApp />
    </SafeAreaProvider>
  );
}

function AllianceApp() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [activeTab, setActiveTab] = useState<Tab>('dialer');
  const [panel, setPanel] = useState<Panel>(null);
  const [locked, setLocked] = useState(true);

  const [targetNumber, setTargetNumber] = useState(DEFAULT_TARGET_NUMBER);
  const [profile, setProfile] = useState<MedicalProfile>(DEFAULT_PROFILE);
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS_TEMPLATE);
  const [coords, setCoords] = useState<Coords | null>(null);

  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const calling = secondsLeft !== null;

  const phoneInputRef = useRef<TextInput>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Inactivity: return to the dialer and close any panel ----
  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      Keyboard.dismiss();
      setActiveTab('dialer');
      setPanel(null);
    }, INACTIVITY_MS);
  }, []);

  useEffect(() => {
    resetInactivity();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivity]);

  // ---- Load saved data + live location ----
  useEffect(() => {
    loadState().then((s) => {
      setProfile(s.profile);
      setTargetNumber(s.targetNumber);
      setSmsTemplate(s.smsTemplate);
    });

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      } catch {
        // Fall back to the verified map address.
      }
    })();
  }, []);

  // ---- Emergency call countdown ----
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setStatusLabel('Dialing Now...');
      const cleaned = targetNumber.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleaned}`).catch(() =>
        Alert.alert('Unable to place call', `This device could not open the dialer for ${targetNumber}.`),
      );
      const reset = setTimeout(() => {
        setSecondsLeft(null);
        setStatusLabel(null);
      }, 4000);
      return () => clearTimeout(reset);
    }
    const tick = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(tick);
  }, [secondsLeft, targetNumber]);

  const triggerEmergencyCall = () => {
    resetInactivity();
    if (calling) {
      // Second tap during the countdown cancels.
      Speech.stop();
      setSecondsLeft(null);
      setStatusLabel(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setStatusLabel('Calling for Help...');
    setSecondsLeft(CALL_COUNTDOWN_SECONDS);
    Speech.stop();
    Speech.speak(`Calling for Help. Broadcasting location at ${VERIFIED_LOCATION.spoken}.`, { rate: 1.0, pitch: 1.0 });
  };

  // ---- Tabs ----
  const switchTab = (tab: Tab) => {
    resetInactivity();
    Haptics.selectionAsync().catch(() => {});
    setActiveTab(tab);
  };

  // ---- Lock / PIN ----
  const toggleLock = () => {
    resetInactivity();
    if (locked) {
      setPinEntry('');
      setPinError(null);
      setPanel('pin');
    } else {
      Keyboard.dismiss();
      setLocked(true);
      saveTargetNumber(targetNumber);
      saveProfile(profile);
    }
  };

  const verifyPin = async () => {
    resetInactivity();
    if (pinEntry === (await getPin())) {
      setLocked(false);
      setPanel(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (activeTab === 'dialer') setTimeout(() => phoneInputRef.current?.focus(), 150);
    } else {
      setPinError('Incorrect PIN. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const saveNewPin = async () => {
    resetInactivity();
    if (!/^\d{4}$/.test(pinEntry)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    try {
      await setPin(pinEntry);
      setPanel(null);
      Alert.alert('PIN updated', 'Your new access PIN has been saved.');
    } catch {
      setPinError('Could not save PIN on this device.');
    }
  };

  // ---- Edits ----
  const updateTarget = (value: string) => {
    resetInactivity();
    setTargetNumber(value);
    saveTargetNumber(value);
  };

  const updateProfile = (field: keyof MedicalProfile, value: string) => {
    resetInactivity();
    setProfile((p) => {
      const next = { ...p, [field]: value };
      saveProfile(next);
      return next;
    });
  };

  // ---- SMS ----
  const smsBody = () => {
    const live = coords ? ` Live GPS: https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}` : '';
    return smsTemplate + live;
  };

  const sendSms = async () => {
    resetInactivity();
    saveSmsTemplate(smsTemplate);
    if (!(await SMS.isAvailableAsync())) {
      Alert.alert('SMS unavailable', 'This device cannot send text messages.');
      return;
    }
    const recipients = Array.from(
      new Set([targetNumber, profile.contactPhone].map((n) => n.replace(/[^0-9+]/g, '')).filter(Boolean)),
    );
    await SMS.sendSMSAsync(recipients, smsBody()).catch(() => {});
  };

  const footerDisabled = activeTab === 'health';
  const status = statusLabel ?? (activeTab === 'dialer' ? 'Alliance Dialer Active' : 'Medical ID');
  const voiceName = Platform.OS === 'ios' ? 'Siri' : 'Google Assistant';

  return (
    <View
      style={styles.root}
      onStartShouldSetResponderCapture={() => {
        resetInactivity();
        return false;
      }}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {/* ---------- Header ---------- */}
        <View style={[styles.header, isTablet && styles.wide]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: calling ? colors.emerald : colors.red }]} />
            <Text style={styles.statusLabel}>{status.toUpperCase()}</Text>
          </View>

          <View style={styles.tabs}>
            <TabButton
              active={activeTab === 'dialer'}
              activeColor={colors.red}
              icon="phone"
              label="Emergency Dialer"
              onPress={() => switchTab('dialer')}
            />
            <TabButton
              active={activeTab === 'health'}
              activeColor={colors.purple}
              icon="heart-pulse"
              iconColor={colors.red}
              label="Medical ID"
              onPress={() => switchTab('health')}
            />
          </View>

          <View style={styles.targetBox}>
            <FontAwesome6 name="phone" size={13} color={colors.slate400} style={{ paddingLeft: 6 }} />
            {activeTab === 'dialer' ? (
              <TextInput
                ref={phoneInputRef}
                value={targetNumber}
                onChangeText={updateTarget}
                editable={!locked}
                keyboardType="phone-pad"
                placeholder="Emergency Target Number"
                placeholderTextColor={colors.slate600}
                style={[styles.targetInput, !locked && styles.targetInputEditing]}
                accessibilityLabel="Emergency target number"
              />
            ) : (
              <Text style={[styles.targetInput, { color: colors.slate300, fontSize: 13 }]} numberOfLines={1}>
                {locked ? 'Medical ID locked' : 'Editing Medical ID'}
              </Text>
            )}
            <Pressable
              onPress={toggleLock}
              style={[styles.lockBtn, !locked && styles.lockBtnOpen]}
              accessibilityRole="button"
              accessibilityLabel={locked ? 'Unlock with PIN' : 'Lock and save'}
            >
              <FontAwesome6 name={locked ? 'lock' : 'lock-open'} size={11} color={locked ? colors.red : colors.emerald} />
              <Text style={[styles.lockText, { color: locked ? colors.red : colors.emerald }]}>
                {locked ? 'LOCKED' : 'UNLOCKED'}
              </Text>
            </Pressable>
          </View>
          {!locked && (
            <Pressable
              onPress={() => {
                setPinEntry('');
                setPinError(null);
                setPanel('changePin');
              }}
              hitSlop={8}
              style={{ alignSelf: 'flex-end' }}
            >
              <Text style={styles.changePin}>Change PIN</Text>
            </Pressable>
          )}
        </View>

        {/* ---------- Main ---------- */}
        <View style={[styles.main, isTablet && styles.wideMain]}>
          {activeTab === 'dialer' ? (
            <View style={styles.dialer}>
              <EmergencyButton calling={calling} secondsLeft={secondsLeft} onPress={triggerEmergencyCall} />
              {calling && <Text style={styles.cancelHint}>Tap the button again to cancel</Text>}
              <View style={styles.addressBlock}>
                <Pressable
                  onPress={() => Linking.openURL(VERIFIED_LOCATION.mapsUrl)}
                  style={styles.mapLink}
                  accessibilityRole="link"
                >
                  <FontAwesome6 name="location-dot" size={12} color={colors.red} />
                  <Text style={styles.mapText}>{VERIFIED_LOCATION.street} (Verified Map Location)</Text>
                </Pressable>
                <Text style={styles.cityText}>{VERIFIED_LOCATION.cityLine}</Text>
                {coords && (
                  <Text style={styles.gpsText}>
                    Live GPS {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                    {coords.accuracy ? `  ±${Math.round(coords.accuracy)}m` : ''}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <HealthIdView profile={profile} editable={!locked} onChange={updateProfile} />
          )}
        </View>

        {/* ---------- Footer ---------- */}
        <View style={[styles.footer, isTablet && styles.wide]}>
          <View style={styles.footerRow}>
            <FooterButton
              icon="comment-sms"
              label="SMS Sync"
              color={colors.red}
              disabled={footerDisabled}
              onPress={() => setPanel('sms')}
            />
            <FooterButton
              icon="microphone-lines"
              label={Platform.OS === 'ios' ? 'Siri & Widgets' : 'Voice & Widgets'}
              color={colors.yellow}
              disabled={footerDisabled}
              onPress={() => setPanel('voice')}
            />
          </View>

          <View style={[styles.brandWrap, footerDisabled && { opacity: 0 }]} pointerEvents={footerDisabled ? 'none' : 'auto'}>
            <View style={styles.brand}>
              <LinearGradient
                colors={['#DC2626', '#2563EB', '#4338CA']}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.brandIcon}
              >
                <FontAwesome6 name="star" solid size={13} color={colors.white} />
              </LinearGradient>
              <View>
                <Text style={styles.brandName}>Alliance Homecare</Text>
                <Text style={styles.brandSub}>EMERGENCY DISPATCH</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* ---------- Panels ---------- */}
      <Sheet
        visible={panel === 'sms'}
        icon="comment-sms"
        accent={colors.red}
        title="Automated SMS & Caregivers"
        description="Configure the emergency text sent to your target number and emergency contact. Live GPS is attached when available."
        onClose={() => setPanel(null)}
      >
        <View style={styles.sheetField}>
          <Text style={[styles.sheetLabel, { color: colors.red }]}>EMERGENCY SMS TEMPLATE</Text>
          <TextInput
            value={smsTemplate}
            onChangeText={(v) => {
              resetInactivity();
              setSmsTemplate(v);
            }}
            multiline
            style={styles.sheetInput}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SheetButton
            label="Save Template"
            grow
            color={colors.red}
            textColor={colors.white}
            onPress={() => {
              saveSmsTemplate(smsTemplate);
              setPanel(null);
            }}
          />
          <SheetButton label="Send Now" grow color="rgba(255,45,85,0.15)" textColor={colors.red} onPress={sendSms} />
        </View>
      </Sheet>

      <Sheet
        visible={panel === 'voice'}
        icon="microphone-lines"
        accent={colors.yellow}
        title={Platform.OS === 'ios' ? 'Siri & Home Widgets' : 'Voice & Home Widgets'}
        description={
          Platform.OS === 'ios'
            ? 'Open the Shortcuts app, create a shortcut that opens Alliance Homecare, and name it "I need assistance". Add it to your Home Screen or Lock Screen for one-tap launch.'
            : 'Long-press the Alliance Homecare icon and drag it to your Home Screen, or ask Google Assistant to open the app hands-free.'
        }
        onClose={() => setPanel(null)}
      >
        <View style={[styles.sheetField, { backgroundColor: 'rgba(255,204,0,0.10)', borderColor: 'rgba(255,204,0,0.2)' }]}>
          <Text style={[styles.sheetLabel, { color: colors.yellow }]}>VOICE PHRASE COMMAND</Text>
          <Text style={[styles.sheetInput, { fontFamily: fonts.mono, fontWeight: '700', color: colors.white }]}>
            {Platform.OS === 'ios' ? '"Hey Siri, I need assistance"' : '"Hey Google, open Alliance Homecare"'}
          </Text>
        </View>
        <SheetButton label="Got It" color={colors.yellow} textColor={colors.black} onPress={() => setPanel(null)} />
        <Text style={styles.footnote}>Uses {voiceName} on this device.</Text>
      </Sheet>

      <Sheet
        visible={panel === 'pin' || panel === 'changePin'}
        icon="shield-halved"
        accent={colors.red}
        title={panel === 'changePin' ? 'Set New PIN' : 'Enter Access PIN'}
        description={
          panel === 'changePin'
            ? 'Choose a new 4-digit PIN for unlocking the target number and Medical ID.'
            : 'Enter your security PIN to unlock and change the target call number and Medical ID.'
        }
        onClose={() => setPanel(null)}
      >
        <TextInput
          value={pinEntry}
          onChangeText={(v) => {
            resetInactivity();
            setPinError(null);
            setPinEntry(v.replace(/\D/g, '').slice(0, 4));
          }}
          onSubmitEditing={panel === 'changePin' ? saveNewPin : verifyPin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={4}
          autoFocus
          placeholder="••••"
          placeholderTextColor={colors.slate600}
          style={styles.pinInput}
          accessibilityLabel="PIN"
        />
        {pinError && <Text style={styles.pinError}>{pinError}</Text>}
        <SheetButton
          label={panel === 'changePin' ? 'Save New PIN' : 'Unlock'}
          color={colors.red}
          textColor={colors.white}
          onPress={panel === 'changePin' ? saveNewPin : verifyPin}
        />
      </Sheet>
    </View>
  );
}

function TabButton({
  active,
  activeColor,
  icon,
  iconColor,
  label,
  onPress,
}: {
  active: boolean;
  activeColor: string;
  icon: string;
  iconColor?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && { backgroundColor: activeColor }]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <FontAwesome6 name={icon as never} size={12} color={active ? colors.white : iconColor ?? colors.slate400} />
      <Text style={[styles.tabText, { color: active ? colors.white : colors.slate400 }]}>{label}</Text>
    </Pressable>
  );
}

function FooterButton({
  icon,
  label,
  color,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.footerBtn,
        disabled
          ? { backgroundColor: colors.glass, borderColor: colors.glass, opacity: 0.4 }
          : { backgroundColor: color + (pressed ? '33' : '1A'), borderColor: color + '33' },
      ]}
    >
      <FontAwesome6 name={icon as never} size={13} color={disabled ? colors.slate600 : color} />
      <Text style={[styles.footerBtnText, { color: disabled ? colors.slate600 : color }]}>{label}</Text>
    </Pressable>
  );
}

function SheetButton({
  label,
  color,
  textColor,
  grow,
  onPress,
}: {
  label: string;
  color: string;
  textColor: string;
  grow?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sheetBtn, grow && { flex: 1 }, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.sheetBtnText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  safe: { flex: 1, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  wide: { maxWidth: 640 },
  wideMain: { maxWidth: 768 },

  header: { width: '100%', gap: 12, paddingBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 32 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { color: colors.slate300, fontFamily: fonts.mono, fontWeight: '700', fontSize: 12, letterSpacing: 1.5 },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabText: { fontFamily: fonts.bold, fontSize: 12 },

  targetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.6)',
  },
  targetInput: {
    flex: 1,
    minWidth: 0,
    color: colors.white,
    fontFamily: fonts.mono,
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 4,
  },
  targetInputEditing: {
    backgroundColor: colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.4)',
  },
  lockBtnOpen: { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.4)' },
  lockText: { fontFamily: fonts.mono, fontWeight: '700', fontSize: 11 },
  changePin: { color: colors.slate400, fontFamily: fonts.semibold, fontSize: 11, textDecorationLine: 'underline' },

  main: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  dialer: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 14 },
  cancelHint: { color: colors.emerald, fontFamily: fonts.semibold, fontSize: 13 },
  addressBlock: { alignItems: 'center', gap: 5, paddingHorizontal: 16 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapText: { color: colors.cyan, fontFamily: fonts.mono, fontWeight: '600', fontSize: 12, letterSpacing: 0.5 },
  cityText: { color: colors.slate400, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.3 },
  gpsText: { color: colors.slate600, fontFamily: fonts.mono, fontSize: 10 },

  footer: { width: '100%', gap: 8, paddingTop: 4 },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerBtnText: { fontFamily: fonts.bold, fontSize: 12 },
  brandWrap: { alignItems: 'center', paddingTop: 4 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.glass,
  },
  brandIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.cyan, fontFamily: fonts.black, fontSize: 12, letterSpacing: -0.2 },
  brandSub: { color: colors.slate400, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 2, marginTop: 2 },

  sheetField: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  sheetLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.5 },
  sheetInput: { color: colors.slate300, fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, padding: 0 },
  sheetBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  sheetBtnText: { fontFamily: fonts.bold, fontSize: 13 },
  footnote: { color: colors.slate600, fontFamily: fonts.regular, fontSize: 11, textAlign: 'center' },
  pinInput: {
    alignSelf: 'center',
    width: 160,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    color: colors.white,
    fontFamily: fonts.mono,
    fontSize: 22,
    letterSpacing: 8,
  },
  pinError: { color: colors.red, fontFamily: fonts.semibold, fontSize: 12, textAlign: 'center' },
});
