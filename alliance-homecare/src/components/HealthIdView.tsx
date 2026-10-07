import { ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import { MedicalProfile } from '../config';
import { colors, fonts } from '../theme';

type Props = {
  profile: MedicalProfile;
  editable: boolean;
  onChange: (field: keyof MedicalProfile, value: string) => void;
};

export function HealthIdView({ profile, editable, onChange }: Props) {
  const field = (key: keyof MedicalProfile, style: TextInputProps['style'], extra?: TextInputProps) => (
    <TextInput
      value={profile[key]}
      editable={editable}
      onChangeText={(v) => onChange(key, v)}
      style={[style, editable && styles.editing]}
      placeholderTextColor={colors.slate600}
      {...extra}
    />
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <FontAwesome6 name="heart-pulse" size={14} color={colors.red} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Medical ID</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {editable ? 'Editing — tap LOCKED to save & lock' : 'Stored securely on this device'}
            </Text>
          </View>
        </View>
      </View>

      <Card label="Photo and Information">
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {field('firstName', [styles.name, { flex: 1 }], { placeholder: 'First' })}
              {field('lastName', [styles.name, { flex: 1.2 }], { placeholder: 'Last' })}
            </View>
            {field('age', styles.age, { placeholder: 'Age' })}
          </View>
          <LinearGradient
            colors={[colors.red, colors.purple]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.avatar}
          >
            <FontAwesome6 name="dragon" size={16} color={colors.white} />
          </LinearGradient>
        </View>
      </Card>

      <Card label="Pregnancy">{field('pregnancy', styles.mono)}</Card>
      <Card label="Medications">{field('medications', styles.mono, { multiline: true })}</Card>
      <Card label="Allergies and Reactions">{field('allergies', styles.mono, { multiline: true })}</Card>

      <Card label="Emergency Contacts">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {field('contactRelation', [styles.small, { flex: 0.8, color: colors.slate300 }])}
          {field('contactName', [styles.small, { flex: 1.3, fontFamily: fonts.bold }])}
          {field('contactPhone', [styles.small, { flex: 1.3, fontFamily: fonts.mono, color: colors.slate200 }], {
            keyboardType: 'phone-pad',
          })}
        </View>
      </Card>
    </ScrollView>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      {children}
    </View>
  );
}

const underline = { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2, minWidth: 0 };

const styles = StyleSheet.create({
  scroll: { width: '100%' },
  content: { gap: 10, paddingHorizontal: 8, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,45,85,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.white, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald },
  statusText: { color: colors.emerald, fontFamily: fonts.mono, fontSize: 10 },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardLabel: {
    color: colors.red,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: colors.white, fontFamily: fonts.black, fontSize: 15, ...underline },
  age: { color: colors.slate300, fontFamily: fonts.semibold, fontSize: 12, paddingVertical: 2, minWidth: 0 },
  mono: { color: colors.white, fontFamily: fonts.mono, fontSize: 13, ...underline },
  small: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12, ...underline },
  editing: { backgroundColor: colors.glass, borderBottomColor: 'rgba(255,255,255,0.3)' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
