import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, TextInput, ActivityIndicator, Platform, StatusBar, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { SERVER_BASE_URL } from '../../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, loadUser } = useAuth();
  const { theme, themeKey, setTheme, THEMES, palettes } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profilePictureVisibility, setProfilePictureVisibility] = useState(user?.profilePictureVisibility || 'public');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [address, setAddress] = useState('');
  const [countryCode, setCountryCode] = useState('+92');
  const [phone, setPhone] = useState('');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfilePictureVisibility(user.profilePictureVisibility || 'public');
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/user/settings');
      if (res.data.success && res.data.data) {
        const s = res.data.data;
        setNotifications(s.notifications ?? true);
        setAddress(s.address || '');
        let p = s.phone || '';
        const prefixes = ['+92', '+44', '+61', '+91', '+971', '+966', '+1'];
        for (let prefix of prefixes) {
          if (p.startsWith(prefix)) {
            setCountryCode(prefix);
            p = p.slice(prefix.length);
            break;
          }
        }
        setPhone(p);
      }
    } catch (error) {
      console.log('Error fetching user settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateSettings = async () => {
    if (phone.trim() && !/^[0-9]{10}$/.test(phone.trim().replace(/\s/g, ''))) {
      Alert.alert('Error', 'Phone number must be exactly 10 digits');
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/user/settings', {
        notifications,
        address: address.trim(),
        phone: countryCode + phone.trim()
      });
      if (res.data.success) {
        Alert.alert('Success', 'Preferences updated successfully!');
      }
    } catch (error) {
      console.log('Error updating settings:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  };

  const validateName = (name) => {
    return name.length >= 2 && name.length <= 100 && /^[a-zA-Z\s]+$/.test(name);
  };

  const pickProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your camera roll to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePicture = async (asset) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // Special handling for Web
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        formData.append('profilePicture', blob, `profile-${Date.now()}.jpg`);
      } else {
        // Mobile (Android/iOS)
        formData.append('profilePicture', {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: `profile-${Date.now()}.jpg`,
        });
      }

      const uploadResponse = await api.post('/user/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResponse.data.success) {
        Alert.alert('Success', 'Profile picture updated successfully!');
        await loadUser();
      }
    } catch (error) {
      console.error("Upload Error:", error.response?.data || error.message);

      const errorMsg = error.response?.data?.message
        || error.response?.data?.error
        || 'Failed to upload profile picture';

      Alert.alert('Upload Failed', errorMsg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateProfile = async () => {
    setErrors({});
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!validateName(name)) {
      newErrors.name = 'Name must be 2-100 characters, letters only';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/user/profile', {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        profilePictureVisibility,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        await loadUser();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to update profile';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setErrors({});
    const newErrors = {};

    if (!oldPassword.trim()) {
      newErrors.oldPassword = 'Current password is required';
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword = 'Password: 6+ chars, mix of letters & numbers';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/user/password', {
        oldPassword,
        newPassword,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to change password';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.inputBg }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Appearance & Theme</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardHint, { color: theme.textSub }]}>
              Customize the look and feel of the application. Select a preset below:
            </Text>

            {/* Custom Dropdown Trigger */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.dropdownTrigger, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              onPress={() => setShowThemeDropdown(!showThemeDropdown)}
            >
              <View style={styles.dropdownLeft}>
                <Text style={styles.dropdownIcon}>{palettes[themeKey]?.icon || '✨'}</Text>
                <Text style={[styles.dropdownValue, { color: theme.text }]}>
                  {palettes[themeKey]?.name || 'System Theme'}
                </Text>
              </View>
              <Ionicons 
                name={showThemeDropdown ? 'chevron-up' : 'chevron-down'} 
                size={18} 
                color={theme.textSub} 
              />
            </TouchableOpacity>

            {/* Custom Dropdown Options */}
            {showThemeDropdown && (
              <View style={[styles.dropdownOptionsList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {Object.keys(palettes).map((key) => {
                  const item = palettes[key];
                  const isSelected = themeKey === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dropdownOptionItem,
                        { borderBottomColor: theme.border },
                        isSelected && { backgroundColor: theme.inputBg }
                      ]}
                      onPress={() => {
                        setTheme(key);
                        setShowThemeDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionIcon}>{item.icon}</Text>
                        <Text style={[styles.optionText, { color: theme.text }, isSelected && { fontWeight: '800' }]}>
                          {item.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Canteen Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Canteen Preferences</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            
            {/* Toggle: Notifications */}
            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <Ionicons name="notifications-outline" size={20} color={theme.textSub} />
                <View>
                  <Text style={[styles.prefLabel, { color: theme.text }]}>Enable Notifications</Text>
                  <Text style={[styles.prefDesc, { color: theme.textSub }]}>Receive order updates and notifications</Text>
                </View>
              </View>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[
                  styles.toggleContainer, 
                  { backgroundColor: notifications ? theme.accent : (theme.isDark ? '#22222E' : '#E8E8F0') }
                ]}
                onPress={() => setNotifications(!notifications)}
              >
                <View style={[
                  styles.toggleDot, 
                  notifications 
                    ? { transform: [{ translateX: 18 }], backgroundColor: '#fff' } 
                    : { transform: [{ translateX: 2 }], backgroundColor: theme.textSub }
                ]} />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Input: Phone */}
            <Text style={[styles.label, { color: theme.textSub, marginTop: 12 }]}>Contact Phone Number</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.inputRow, { backgroundColor: theme.inputBg, borderColor: theme.border, width: 130, paddingHorizontal: 0 }]}>
                <Picker
                  selectedValue={countryCode}
                  onValueChange={(val) => setCountryCode(val)}
                  style={{ width: '100%', color: theme.text }}
                  dropdownIconColor={theme.textSub}
                >
                  <Picker.Item label="🇵🇰 (+92)" value="+92" />
                  <Picker.Item label="🇺🇸 (+1)" value="+1" />
                  <Picker.Item label="🇬🇧 (+44)" value="+44" />
                  <Picker.Item label="🇦🇺 (+61)" value="+61" />
                  <Picker.Item label="🇨🇦 (+1)" value="+1" />
                  <Picker.Item label="🇮🇳 (+91)" value="+91" />
                  <Picker.Item label="🇦🇪 (+971)" value="+971" />
                  <Picker.Item label="🇸🇦 (+966)" value="+966" />
                </Picker>
              </View>
              <View style={[styles.inputRow, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="call-outline" size={18} color={theme.textSub} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.inputField, { color: theme.text, flex: 1 }]}
                  placeholder="3001234567"
                  placeholderTextColor={theme.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Input: Address */}
            <Text style={[styles.label, { color: theme.textSub, marginTop: 16 }]}>Default Delivery Address (Hostel/Room)</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.inputBg, borderColor: theme.border, alignItems: 'flex-start', paddingVertical: 10 }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSub} style={{ marginRight: 8, marginTop: 2 }} />
              <TextInput
                style={[styles.inputField, { color: theme.text, minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Hostel Name, Floor, Room Number..."
                placeholderTextColor={theme.textMuted}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }, loading && styles.buttonDisabled]}
              onPress={handleUpdateSettings}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Preferences</Text>
              )}
            </TouchableOpacity>

          </View>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Profile Information</Text>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Profile Picture Section */}
            <View style={styles.profilePictureSection}>
              <View style={[styles.profilePictureBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                {user?.profilePicture ? (
                  <Image
                    source={{ uri: `${SERVER_BASE_URL}${user.profilePicture}` }}
                    style={styles.profilePictureImage}
                  />
                ) : (
                  <Ionicons name="person" size={48} color={theme.accent} />
                )}
              </View>
              <TouchableOpacity
                style={[styles.uploadPhotoBtn, { backgroundColor: theme.accent }]}
                onPress={pickProfilePicture}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="camera" size={16} color="#fff" />
                    <Text style={styles.uploadPhotoBtnText}>Change Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Profile Photo Privacy Options */}
            <Text style={[styles.label, { color: theme.textSub, marginTop: 4, marginBottom: 8 }]}>Profile Photo Privacy</Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.privacyOptionCard,
                  { 
                    backgroundColor: theme.inputBg, 
                    borderColor: profilePictureVisibility === 'public' ? theme.accent : theme.border,
                    borderWidth: profilePictureVisibility === 'public' ? 2 : 1.5,
                  }
                ]}
                onPress={() => setProfilePictureVisibility('public')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons 
                    name="earth" 
                    size={16} 
                    color={profilePictureVisibility === 'public' ? theme.accent : theme.textSub} 
                  />
                  <Text style={[styles.privacyOptionText, { color: theme.text, fontWeight: profilePictureVisibility === 'public' ? '800' : '500' }]}>
                    Public
                  </Text>
                </View>
                {profilePictureVisibility === 'public' && (
                  <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.privacyOptionCard,
                  { 
                    backgroundColor: theme.inputBg, 
                    borderColor: profilePictureVisibility === 'private' ? theme.accent : theme.border,
                    borderWidth: profilePictureVisibility === 'private' ? 2 : 1.5,
                  }
                ]}
                onPress={() => setProfilePictureVisibility('private')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons 
                    name="lock-closed" 
                    size={16} 
                    color={profilePictureVisibility === 'private' ? theme.accent : theme.textSub} 
                  />
                  <Text style={[styles.privacyOptionText, { color: theme.text, fontWeight: profilePictureVisibility === 'private' ? '800' : '500' }]}>
                    Private
                  </Text>
                </View>
                {profilePictureVisibility === 'private' && (
                  <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: theme.textSub, marginBottom: 12, fontStyle: 'italic', lineHeight: 16 }}>
              {profilePictureVisibility === 'public' 
                ? "🌐 Public: Everyone (including Canteen Admins) can see your custom profile photo."
                : "🔒 Private: Only you can see your custom profile photo. Others will see a default placeholder."}
            </Text>

            <Text style={[styles.label, { color: theme.textSub, marginTop: 20 }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border },
                errors.name && { borderColor: theme.error }
              ]}
              placeholder="Enter your full name"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              editable={!loading}
            />
            {errors.name && <Text style={[styles.errorText, { color: theme.error }]}>{errors.name}</Text>}

            <Text style={[styles.label, { color: theme.textSub, marginTop: 16 }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border },
                errors.email && { borderColor: theme.error }
              ]}
              placeholder="your.email@university.edu"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              editable={!loading}
            />
            {errors.email && <Text style={[styles.errorText, { color: theme.error }]}>{errors.email}</Text>}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }, loading && styles.buttonDisabled]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Change Password</Text>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSub }]}>Current Password</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border },
                errors.oldPassword && { borderColor: theme.error }
              ]}
              placeholder="Enter current password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={oldPassword}
              onChangeText={(text) => {
                setOldPassword(text);
                if (errors.oldPassword) setErrors({ ...errors, oldPassword: '' });
              }}
              editable={!loading}
            />
            {errors.oldPassword && <Text style={[styles.errorText, { color: theme.error }]}>{errors.oldPassword}</Text>}

            <Text style={[styles.label, { color: theme.textSub, marginTop: 16 }]}>New Password</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border },
                errors.newPassword && { borderColor: theme.error }
              ]}
              placeholder="6+ chars, letters & numbers"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
              }}
              editable={!loading}
            />
            {errors.newPassword && <Text style={[styles.errorText, { color: theme.error }]}>{errors.newPassword}</Text>}

            <Text style={[styles.label, { color: theme.textSub, marginTop: 16 }]}>Confirm New Password</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border },
                errors.confirmPassword && { borderColor: theme.error }
              ]}
              placeholder="Confirm new password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              editable={!loading}
            />
            {errors.confirmPassword && <Text style={[styles.errorText, { color: theme.error }]}>{errors.confirmPassword}</Text>}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }, loading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>Account Actions</Text>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: theme.error }]}
              onPress={() => {
                const performLogout = async () => {
                  await logout();
                  router.replace('/login');   
                };

                if (Platform.OS === 'web') {
                  const confirmLogout = window.confirm('Are you sure you want to log out?');
                  if (confirmLogout) {
                    performLogout();
                  }
                } else {
                  Alert.alert(
                    'Logout',
                    'Are you sure you want to log out?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Logout',
                        style: 'destructive',
                        onPress: performLogout,
                      },
                    ]
                  );
                }
              }}
            >
              <Text style={[styles.dangerButtonText, { color: theme.error }]}>Log Out of Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  privacyOptionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  privacyOptionText: {
    fontSize: 14,
  },
  profilePictureBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  profilePictureImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadPhotoBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  button: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dangerButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    minHeight: 84,
    justifyContent: 'center',
  },
  themeIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  themeName: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 10,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownIcon: {
    fontSize: 20,
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownOptionsList: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  prefDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  toggleContainer: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
  },
});
