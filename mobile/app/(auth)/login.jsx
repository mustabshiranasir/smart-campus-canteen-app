// mobile/app/(auth)/login.jsx
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, StatusBar,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

/* ─── Reusable Input Field ────────────────────────────────── */
function InputField({ label, icon, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, error, editable, hasForgotPassword }) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Use value or focus to determine if label floats
  const isFloating = focused || value.length > 0;
  const floatAnim = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(floatAnim, {
      toValue: isFloating ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFloating]);

  const onFocus = () => {
    setFocused(true);
  };
  
  const onBlur = () => {
    setFocused(false);
  };

  const labelTop = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
  const labelSize = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 12] });
  const labelColor = floatAnim.interpolate({ inputRange: [0, 1], outputRange: ['#9CA3AF', '#FF6B35'] });
  const borderColor = focused ? '#FF6B35' : (error ? '#EF4444' : '#F3F4F6');
  const shadowOpacity = focused ? 0.1 : 0;

  return (
    <View style={styles.fieldWrap}>
      {hasForgotPassword && (
        <View style={styles.forgotPassRow}>
          <View />
          <TouchableOpacity activeOpacity={0.6}>
            <Text style={styles.forgotPassText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Animated.View style={[styles.inputWrap, {
        borderColor: borderColor,
        shadowOpacity: shadowOpacity,
      }]}>
        <Ionicons name={icon} size={22} color={focused ? '#FF6B35' : '#9CA3AF'} style={styles.inputIcon} />
        <View style={styles.inputInner}>
          <Animated.Text style={[styles.floatingLabel, { top: labelTop, fontSize: labelSize, color: error ? '#EF4444' : labelColor }]}>
            {label}
          </Animated.Text>
          <TextInput
            style={[styles.input, { marginTop: isFloating ? 12 : 0 }]}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            secureTextEntry={secureTextEntry && !showPassword}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={autoCapitalize || 'none'}
            editable={editable !== false}
            selectionColor="#FF6B35"
          />
        </View>
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ─── Main Login Screen ───────────────────────────────────── */
export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams();
  const { login } = useAuth();
  const { theme } = useTheme();

  const isFaculty = role === 'faculty';
  const isAdmin = role === 'admin';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const cardAnim = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleLogin = async () => {
    Keyboard.dismiss();
    setSuccessMsg('');
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = isAdmin
        ? 'Email address is required'
        : (isFaculty ? 'Enter your email or faculty ID' : 'Enter your email or roll number');
    } else if (identifier.trim().length < 3) {
      newErrors.identifier = 'Must be at least 3 characters';
    }
    
    if (!password.trim()) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be 6+ characters';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
        role: role || 'student',
      });

      if (response.data.success) {
        const { data } = response.data;
        setSuccessMsg(`Welcome back, ${data.name}!`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(data, data.token || '');
        setTimeout(() => {
          if (data.role === 'admin') router.replace('/(admin)/');
          else router.replace('/(student)/');
        }, 600);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please try again.';
      setErrors({ general: msg });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const identifierIcon = isEmail(identifier)
    ? 'mail-outline'
    : identifier.length > 0
      ? 'id-card-outline'
      : isAdmin
        ? 'mail-outline'
        : 'person-outline';

  const identifierLabel = isAdmin
    ? 'Admin email address'
    : (isFaculty
      ? 'Email or Faculty ID'
      : 'Email or Roll Number');

  return (
    <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.card, {
            transform: [{ translateY: cardAnim }],
            opacity: cardOpacity,
          }]}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name={isAdmin ? 'shield-checkmark' : (isFaculty ? 'briefcase' : 'school')} size={38} color="#FF6B35" />
              </View>
            </View>

            <Text style={styles.title}>
              Welcome Back
            </Text>
            <Text style={styles.subtitle}>
              {isAdmin ? 'Access the management portal' : (isFaculty ? 'Sign in to access your faculty account' : 'Sign in to order your favorite food')}
            </Text>

            {successMsg ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}
            {errors.general ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <InputField
              label={identifierLabel}
              icon={identifierIcon}
              value={identifier}
              onChangeText={(t) => { setIdentifier(t); if (errors.identifier) setErrors({ ...errors, identifier: '' }); }}
              keyboardType={isEmail(identifier) ? 'email-address' : 'default'}
              autoCapitalize={isEmail(identifier) ? 'none' : 'characters'}
              error={errors.identifier}
              editable={!loading}
            />

            <InputField
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: '' }); }}
              secureTextEntry
              error={errors.password}
              editable={!loading}
              hasForgotPassword={true}
            />

            <TouchableOpacity
              style={styles.btnShadow}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.btnGradient} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.btnIcon} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footNote}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => !loading && router.push({ pathname: '/(auth)/register', params: { role } })}>
                <Text style={styles.link}>Register</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 36, justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, shadowRadius: 32, elevation: 10,
    marginTop: 30,
  },
  iconContainer: {
    alignItems: 'center', marginTop: -60, marginBottom: 16,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ECFDF5', padding: 14, borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#A7F3D0'
  },
  successText: { fontSize: 14, fontWeight: '600', color: '#065F46', flex: 1 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#FECACA'
  },
  errorBannerText: { fontSize: 14, fontWeight: '500', color: '#991B1B', flex: 1 },
  fieldWrap: { marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12, height: 56,
    borderWidth: 1.5, paddingHorizontal: 16,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
  inputIcon: { marginRight: 12 },
  inputInner: { flex: 1, height: '100%', justifyContent: 'center' },
  floatingLabel: { position: 'absolute', left: 0, fontWeight: '600', letterSpacing: 0.2 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', color: '#111827', height: '100%', paddingVertical: 0 },
  eyeBtn: { padding: 4, marginLeft: 8 },
  forgotPassRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  forgotPassText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  errorText: { fontSize: 13, fontWeight: '500', color: '#EF4444' },
  btnShadow: {
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    marginTop: 12, marginBottom: 24, borderRadius: 12,
  },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 12,
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  btnIcon: { marginLeft: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footNote: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  link: { color: '#FF6B35', fontSize: 14, fontWeight: 'bold' },
});