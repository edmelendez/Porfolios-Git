import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

type Props = {
  calling: boolean;
  secondsLeft: number | null;
  onPress: () => void;
};

const IDLE_GRADIENT = ['rgba(255,45,85,0.95)', 'rgba(180,20,55,0.95)', 'rgba(100,5,25,0.95)'] as const;
const CALLING_GRADIENT = ['rgba(34,197,94,0.95)', 'rgba(21,128,61,0.95)', 'rgba(100,5,25,0.95)'] as const;

export function EmergencyButton({ calling, secondsLeft, onPress }: Props) {
  const { width } = useWindowDimensions();
  const maxSize = width >= 768 ? 400 : 340;
  const size = Math.min(width * 0.78, maxSize);
  const scale = size / 340;

  const glow = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  // Soft "breathing" glow behind the button (pulseGlow, 3s).
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  // Expanding green ring while a call is pending (pulseGreen, 1.5s).
  useEffect(() => {
    if (!calling) {
      ring.stopAnimation();
      ring.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [calling, ring]);

  useEffect(() => {
    Animated.spring(press, { toValue: calling ? 1.06 : 1, useNativeDriver: true, friction: 5 }).start();
  }, [calling, press]);

  const glowColor = calling ? colors.green : colors.red;
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.06] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  const title = calling ? 'CALLING' : 'GET HELP';
  const subtitle = calling ? (secondsLeft && secondsLeft > 0 ? `IN ${secondsLeft}` : 'NOW') : 'NOW';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Layered translucent discs stand in for the CSS blur-3xl glow. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transform: [{ scale: glowScale }], opacity: glowOpacity }]}
      >
        {[1.18, 1.1, 1.02].map((s, i) => (
          <View
            key={s}
            style={[
              styles.disc,
              { width: size, height: size, borderRadius: size / 2, backgroundColor: glowColor, opacity: 0.18 + i * 0.1, transform: [{ scale: s }] },
            ]}
          />
        ))}
      </Animated.View>

      {calling && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.disc,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 15,
              borderColor: 'rgba(34,197,94,0.6)',
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ scale: press }] }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={calling ? 'Calling for help. Tap to cancel.' : 'Get help now. Calls your emergency number.'}
          style={({ pressed }) => [
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              shadowColor: calling ? colors.green : colors.red,
              transform: [{ scale: pressed ? 1.04 : 1 }],
            },
          ]}
        >
          <LinearGradient
            colors={calling ? CALLING_GRADIENT : IDLE_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
          />
          <FontAwesome6 name="phone" size={84 * scale} color={colors.white} style={styles.icon} />
          <Text allowFontScaling={false} style={[styles.title, { fontSize: 33 * scale }]}>
            {title}
          </Text>
          <Text allowFontScaling={false} style={[styles.title, { fontSize: 33 * scale }]}>
            {subtitle}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  disc: {
    position: 'absolute',
    alignSelf: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 18,
  },
  icon: {
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    color: colors.white,
    fontFamily: fonts.black,
    letterSpacing: 2,
    lineHeight: undefined,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
