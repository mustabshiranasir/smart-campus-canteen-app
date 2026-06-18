// mobile/app/(auth)/register.jsx
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, StatusBar,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const countryCurrencyMap = {
  PK: 'PKR', US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD',
  IN: 'INR', AE: 'AED', SA: 'SAR'
};

/* ─── Password Strength Meter ────────────────────────────── */
function PasswordStrength({ password }) {
  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: 'transparent' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: score, label: 'Weak', color: '#EF4444' };
    if (score <= 3) return { level: score, label: 'Fair', color: '#F59E0B' };
    return { level: score, label: 'Strong', color: '#10B981' };
  };
  const { level, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <View style={styles.strengthWrap}>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.strengthBar, { backgroundColor: i <= level ? color : '#E5E7EB' }]} />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
    </View>
  );
}

/* ─── Reusable Input Field ────────────────────────────────── */
function InputField({ label, icon, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, error, editable, children, maxLength, prefix }) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isFloating = focused || value.length > 0;
  const floatAnim = useRef(new Animated.Value(isFloating ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(floatAnim, {
      toValue: isFloating ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFloating]);

  const onFocus = () => setFocused(true);
  const onBlur = () => setFocused(false);

  const labelTop = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
  const labelSize = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 12] });
  const labelColor = floatAnim.interpolate({ inputRange: [0, 1], outputRange: ['#9CA3AF', '#FF6B35'] });
  const borderColor = focused ? '#FF6B35' : (error ? '#EF4444' : '#F3F4F6');
  const shadowOpacity = focused ? 0.1 : 0;

  return (
    <View style={styles.fieldWrap}>
      <Animated.View style={[styles.inputWrap, { borderColor, shadowOpacity }]}>
        {icon && <Ionicons name={icon} size={22} color={focused ? '#FF6B35' : '#9CA3AF'} style={styles.inputIcon} />}
        {prefix && (
          <View style={styles.prefixPill}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
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
            maxLength={maxLength}
            selectionColor="#FF6B35"
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
            textContentType="none"
          />
        </View>
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.rightBtn}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : (
          value.length > 0 && editable !== false && (
            <TouchableOpacity onPress={() => onChangeText('')} style={styles.rightBtn}>
              <Ionicons name="close-circle" size={18} color="#D1D5DB" />
            </TouchableOpacity>
          )
        )}
      </Animated.View>
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ─── Main Register Screen ────────────────────────────────── */
export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState('Student');

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('PK');
  const [callingCode, setCallingCode] = useState('+92');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Role-specific fields
  const [rollNumber, setRollNumber] = useState(''); // Used for Student Roll / Faculty Dept
  const [adminCode, setAdminCode] = useState('');

  // OTP Verification flow
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [serverOtpCode, setServerOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

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

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validateName = (v) => v.length >= 2 && v.length <= 100 && /^[a-zA-Z\s]+$/.test(v);
  const validatePassword = (v) => v.length >= 6 && /[a-zA-Z]/.test(v) && /[0-9]/.test(v);
  const validatePhone = (v) => /^[0-9]{10}$/.test(v.replace(/\s/g, ''));
  const validateRollNumber = (v) => v.length >= 2 && /^[a-zA-Z0-9\-\/ ]+$/.test(v);

  const handlePhoneChange = (text) => {
    setPhone(text);
    if (otpSent) {
      setOtpSent(false);
      setOtpCode('');
      setServerOtpCode('');
      setSuccessMsg('');
    }
    if (errors.phone) setErrors({ ...errors, phone: '' });
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setErrors({ phone: 'Phone number is required' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!validatePhone(phone)) {
      setErrors({ phone: 'Phone number must be exactly 10 digits' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setErrors({});
    setSendingOtp(true);
    setSuccessMsg('');

    try {
      const response = await api.post('/auth/send-otp', { phone: callingCode + phone.trim() });
      if (response.data.success) {
        setOtpSent(true);
        setServerOtpCode(response.data.code);
        setSuccessMsg('Verification code sent successfully!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send verification code. Try again.';
      setErrors({ general: msg });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    setSuccessMsg('');
    const newErrors = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    else if (!validateName(name)) newErrors.name = 'Name: 2–100 letters only';

    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Enter a valid email address';

    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!validatePhone(phone)) newErrors.phone = 'Phone number must be exactly 10 digits';

    if (role === 'Student') {
      if (!rollNumber.trim()) newErrors.rollNumber = 'Roll number is required';
      else if (!validateRollNumber(rollNumber)) newErrors.rollNumber = 'Invalid format';
    } else if (role === 'Faculty') {
      if (!rollNumber.trim()) newErrors.rollNumber = 'Department is required';
      else if (!validateRollNumber(rollNumber)) newErrors.rollNumber = 'Invalid format';
    } else if (role === 'Admin') {
      if (!adminCode.trim()) newErrors.adminCode = 'Admin verification code is required';
    }

    if (!password.trim()) newErrors.password = 'Password is required';
    else if (!validatePassword(password)) newErrors.password = 'Password: 6+ chars, letters & numbers';

    if (!confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setErrors({});

    if (!otpSent) {
      await handleSendOtp();
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrors({ otpCode: 'Enter the 6-digit verification code' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: callingCode + phone.trim(),
        password,
        confirmPassword,
        role: role.toLowerCase(),
        otpCode: otpCode.trim(),
      };

      if (role !== 'Admin') payload.rollNumber = rollNumber.trim();
      if (role === 'Admin') payload.adminCode = adminCode.trim();

      const response = await api.post('/auth/register', payload);

      if (response.data.success) {
        const { data } = response.data;
        setSuccessMsg(`Account created! Welcome, ${data.name}!`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(data, data.token || '');
        setTimeout(() => {
          if (data.role === 'admin') router.replace('/(admin)/');
          else router.replace('/(student)/');
        }, 800);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed. Please try again.';
      setErrors({ general: msg });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const clearErr = (field, setter) => (text) => {
    setter(text);
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Campus Canteen today</Text>

            {/* Segmented Role Tabs */}
            <View style={styles.tabContainer}>
              {['Student', 'Faculty', 'Admin'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    setRole(r);
                    setErrors({});
                  }}
                  style={[styles.tabBtn, role === r && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabText, role === r && styles.tabTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

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

            <InputField label="Full Name" icon="person-outline" value={name}
              onChangeText={clearErr('name', setName)} autoCapitalize="words" error={errors.name} editable={!loading && !otpSent} />

            <InputField label="Email Address" icon="mail-outline" value={email}
              onChangeText={clearErr('email', setEmail)} keyboardType="email-address" error={errors.email} editable={!loading && !otpSent} />

            <View style={styles.countryCurrencyRow}>
              <View style={styles.countryBox}>
                <Text style={styles.floatingLabelStatic}>Country</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={countryCode}
                    onValueChange={(itemValue) => {
                      setCountryCode(itemValue);
                      const codeMap = { PK: '+92', US: '+1', GB: '+44', AU: '+61', CA: '+1', IN: '+91', AE: '+971', SA: '+966' };
                      setCallingCode(codeMap[itemValue] || '+1');
                    }}
                    style={{ flex: 1, color: '#111827', marginLeft: -8 }}
                  >
                    <Picker.Item label="🇵🇰 (+92)" value="PK" />
                    <Picker.Item label="🇺🇸 (+1)" value="US" />
                    <Picker.Item label="🇬🇧 (+44)" value="GB" />
                    <Picker.Item label="🇦🇺 (+61)" value="AU" />
                    <Picker.Item label="🇨🇦 (+1)" value="CA" />
                    <Picker.Item label="🇮🇳 (+91)" value="IN" />
                    <Picker.Item label="🇦🇪 (+971)" value="AE" />
                    <Picker.Item label="🇸🇦 (+966)" value="SA" />
                  </Picker>
                </View>
              </View>
              <View style={styles.currencyBox}>
                <Text style={styles.floatingLabelStatic}>Currency</Text>
                <TextInput style={styles.inputDisabled} value={countryCurrencyMap[countryCode] || 'USD'} editable={false} />
              </View>
            </View>

            <InputField label="Phone Number" icon="call-outline" value={phone}
              onChangeText={handlePhoneChange} keyboardType="phone-pad" error={errors.phone} editable={!loading && !otpSent} maxLength={10} prefix={callingCode} />

            {role === 'Student' && (
              <InputField label="Roll Number" icon="id-card-outline" value={rollNumber}
                onChangeText={clearErr('rollNumber', setRollNumber)} autoCapitalize="characters" error={errors.rollNumber} editable={!loading && !otpSent} maxLength={20} />
            )}

            {role === 'Faculty' && (
              <InputField label="Department" icon="business-outline" value={rollNumber}
                onChangeText={clearErr('rollNumber', setRollNumber)} autoCapitalize="words" error={errors.rollNumber} editable={!loading && !otpSent} maxLength={30} />
            )}

            {role === 'Admin' && (
              <InputField label="Admin Secret Code" icon="shield-outline" value={adminCode}
                onChangeText={clearErr('adminCode', setAdminCode)} secureTextEntry error={errors.adminCode} editable={!loading && !otpSent} maxLength={30} />
            )}

            <InputField label="Password" icon="lock-closed-outline" value={password}
              onChangeText={clearErr('password', setPassword)} secureTextEntry error={errors.password} editable={!loading && !otpSent}>
              <PasswordStrength password={password} />
            </InputField>

            <InputField label="Confirm Password" icon="shield-checkmark-outline" value={confirmPassword}
              onChangeText={clearErr('confirmPassword', setConfirmPassword)} secureTextEntry error={errors.confirmPassword} editable={!loading && !otpSent} />

            {otpSent && (
              <View style={styles.otpWrapper}>
                <View style={styles.smsCard}>
                  <Ionicons name="chatbubbles-outline" size={20} color="#FF6B35" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.smsTitle}>Simulated SMS Received</Text>
                    <Text style={styles.smsText}>Code: <Text style={{ fontWeight: '800', color: '#FF6B35', fontSize: 16 }}>{serverOtpCode}</Text></Text>
                  </View>
                </View>
                <InputField label="Enter 6-Digit OTP" icon="key-outline" value={otpCode}
                  onChangeText={(t) => { setOtpCode(t); if (errors.otpCode) setErrors({ ...errors, otpCode: '' }); }}
                  keyboardType="number-pad" error={errors.otpCode} editable={!loading} maxLength={6} />
                <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp || loading} activeOpacity={0.8} style={styles.resendBtn}>
                  {sendingOtp ? <ActivityIndicator size="small" color="#FF6B35" /> : <Text style={styles.resendText}>Resend OTP</Text>}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.btnShadow} onPress={handleRegister} disabled={loading || sendingOtp} activeOpacity={0.8}>
              <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.btnGradient} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
                {loading || sendingOtp ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.btnText}>{otpSent ? 'Verify Phone & Register' : 'Send OTP & Verify'}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.btnIcon} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footNote}>Already have an account? </Text>
              <TouchableOpacity onPress={() => !loading && router.push('/(auth)/login')}>
                <Text style={styles.link}>Sign In</Text>
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
    borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, shadowRadius: 32, elevation: 10,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  tabContainer: {
    flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12,
    padding: 4, marginBottom: 24,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FF6B35' },
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
  fieldWrap: { marginBottom: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, height: 56,
    borderWidth: 1.5, paddingHorizontal: 16,
    shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
  },
  inputIcon: { marginRight: 12 },
  prefixPill: {
    backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, marginRight: 12,
  },
  prefixText: { color: '#374151', fontSize: 14, fontWeight: '700' },
  inputInner: { flex: 1, height: '100%', justifyContent: 'center' },
  floatingLabel: { position: 'absolute', left: 0, fontWeight: '600', letterSpacing: 0.3 },
  floatingLabelStatic: { position: 'absolute', left: 16, top: 6, fontSize: 12, color: '#9CA3AF', fontWeight: '600', zIndex: 1 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', color: '#111827', height: '100%', paddingVertical: 0 },
  rightBtn: { padding: 6, marginLeft: 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  errorText: { fontSize: 13, fontWeight: '500', color: '#EF4444' },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10, paddingHorizontal: 4 },
  strengthBars: { flexDirection: 'row', gap: 6, flex: 1 },
  strengthBar: { height: 4, flex: 1, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: 'bold', width: 44, textAlign: 'right' },
  countryCurrencyRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  countryBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, height: 56, borderWidth: 1.5, borderColor: '#F3F4F6', justifyContent: 'center', paddingHorizontal: 14 },
  pickerWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  countryPickerBtn: { margin: 0, padding: 0 },
  countryCodeText: { fontSize: 16, fontWeight: '500', color: '#111827', marginLeft: 4, flex: 1 },
  currencyBox: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, height: 56, borderWidth: 1.5, borderColor: '#F3F4F6', justifyContent: 'center', paddingHorizontal: 14 },
  inputDisabled: { fontSize: 16, fontWeight: '500', color: '#6B7280', marginTop: 12 },
  otpWrapper: { marginTop: 8, marginBottom: 8 },
  smsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF7ED', padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#FFEDD5', marginBottom: 16,
  },
  smsTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  smsText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  resendBtn: { paddingVertical: 8, alignSelf: 'center' },
  resendText: { fontSize: 13, fontWeight: 'bold', color: '#FF6B35' },
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