import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

type Props = {
  visible: boolean;
  icon: string;
  accent: string;
  title: string;
  description?: string;
  onClose?: () => void;
  children: ReactNode;
};

// Rendered inside the root view (not a RN <Modal>) so the root's touch
// capture keeps resetting the inactivity timer while a panel is open.
export function Sheet({ visible, icon, accent, title, description, onClose, children }: Props) {
  if (!visible) return null;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: accent + '26' }]}>
            <FontAwesome6 name={icon as never} size={18} color={accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {onClose && (
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <FontAwesome6 name="xmark" size={18} color={colors.slate400} />
            </Pressable>
          )}
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 50,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    borderRadius: 16,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  description: {
    color: colors.slate400,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});
