// mobile/app/index.jsx
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Dimensions, Pressable, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width: W } = Dimensions.get('window');

function RoleCard({ icon, label, sublabel, onPress, theme, delay = 0 }) {
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }], width: '100%' }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[styles.card, {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        }]}>
          <View style={[styles.cardStrip, { backgroundColor: theme.accent }]} />
          <View style={styles.cardInner}>
            <View style={[styles.iconWrap, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name={icon} size={28} color={theme.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { color: theme.text }]}>{label}</Text>
              <Text style={[styles.cardSub, { color: theme.textSub }]}>{sublabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(titleAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />

      {/* Decorative blobs */}
      <View style={[styles.blobTop, { backgroundColor: theme.accentSoft }]} />
      <View style={[styles.blobBottom, { backgroundColor: theme.accentSoft }]} />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoSection, {
          opacity: logoAnim,
          transform: [{ scale: logoAnim }],
        }]}>
          <View style={[styles.logoBg, { shadowColor: theme.accent }]}>
            <View style={[styles.logoGrad, { backgroundColor: '#fff' }]}>
              <Image 
                source={theme.isDark ? require('../assets/images/logo-dark.jpg') : require('../assets/images/icon.png')} 
                style={{ width: 92, height: 92, borderRadius: 28 }} 
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleAnim }}>
          <Text style={[styles.appTitle, { color: theme.text }]}>Foodie Moodie</Text>
          <Text style={[styles.appTagline, { color: theme.textSub }]}>
            Order food. Skip the queue.
          </Text>
        </Animated.View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.chooseLabel, { color: theme.textMuted }]}>CONTINUE AS</Text>

        <View style={styles.cards}>
          <RoleCard
            icon="school-outline"
            label="Student"
            sublabel="Browse menu & place orders"
            onPress={() => router.push('/(auth)/login')}
            theme={theme}
            delay={200}
          />
          <RoleCard
            icon="briefcase-outline"
            label="Faculty"
            sublabel="Browse menu & place orders"
            onPress={() => router.push('/(auth)/login?role=faculty')}
            theme={theme}
            delay={260}
          />
          <RoleCard
            icon="restaurant-outline"
            label="Admin"
            sublabel="Manage menu & operations"
            onPress={() => router.push('/(auth)/login?role=admin')}
            theme={theme}
            delay={320}
          />
        </View>

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          COMSATS University · v1.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blobTop: {
    position: 'absolute', top: -80, right: -60,
    width: 220, height: 220, borderRadius: 110,
  },
  blobBottom: {
    position: 'absolute', bottom: -60, left: -60,
    width: 180, height: 180, borderRadius: 90,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  logoSection: { marginBottom: 28, alignItems: 'center' },
  logoBg: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  logoGrad: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  divider: { height: 1, width: '100%', marginVertical: 28 },
  chooseLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  cards: { width: '100%', gap: 12, marginBottom: 40 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  cardStrip: { height: 3, width: '100%' },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 12, fontWeight: '500' },
  footer: { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
});