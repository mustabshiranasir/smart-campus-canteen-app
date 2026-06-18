// mobile/app/(student)/profile.jsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal, TextInput, ActivityIndicator, Platform, StatusBar, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { SERVER_BASE_URL } from '../../services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, loadUser } = useAuth();
  const { totalItems } = useCart();
  const { theme } = useTheme();

  const [topUpModal, setTopUpModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [topping, setTopping] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Payment Gateway States ──
  const [topUpStep, setTopUpStep] = useState('amount'); // 'amount' | 'details' | 'processing' | 'success'
  const [paymentGateway, setPaymentGateway] = useState('easypaisa'); // 'easypaisa' | 'jazzcash' | 'bank'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [processingMsg, setProcessingMsg] = useState('Connecting to secure Gateway...');

  const uploadProfilePicture = async (asset) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append('profilePicture', blob, `profile-${Date.now()}.jpg`);
      } else {
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
      const errorMsg = error.response?.data?.message || 'Failed to upload profile picture';
      Alert.alert('Upload Failed', errorMsg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAvatarPress = () => {
    if (uploadingPhoto) return;

    const chooseFromGallery = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need access to your library to select a picture.');
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
      } catch (err) {
        Alert.alert('Error', 'Failed to pick image');
      }
    };

    const takePhoto = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need access to your camera to take a photo.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadProfilePicture(result.assets[0]);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to take photo');
      }
    };

    if (Platform.OS === 'web') {
      const option = window.confirm(
        "Update Profile Picture\n\nClick OK to select from Library, Cancel to skip."
      );
      if (option) {
        chooseFromGallery();
      }
    } else {
      Alert.alert(
        'Update Profile Picture',
        'Choose how you want to upload your photo',
        [
          { text: 'Choose from Gallery', onPress: chooseFromGallery },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // ── Profile data ──
  const profile = {
    name: user?.name || (user?.role === 'faculty' ? 'Faculty User' : 'Student User'),
    email: user?.email || (user?.role === 'faculty' ? 'faculty@university.edu' : 'student@university.edu'),
    walletBalance: Math.round(user?.walletBalance ?? 0),
    totalOrders: user?.totalOrders ?? 0,
  };

  // ── Logout Handler ──
  const handleLogout = () => {
    const performLogout = async () => {
      await logout(); // ✅ Clears user, token, and navigates to role selection
      router.replace('/');
    };

    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to log out?');
      if (confirmLogout) {
        performLogout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout', style: 'destructive',
          onPress: performLogout,
        },
      ]);
    }
  };

  // ── Wallet top-up submission ──
  const handleProceedToDetails = () => {
    const num = parseInt(amount);
    if (!num || num < 100) {
      Alert.alert('Invalid Amount', 'Minimum top-up is Rs. 100');
      return;
    }
    if (num > 10000) {
      Alert.alert('Invalid Amount', 'Maximum top-up is Rs. 10,000');
      return;
    }
    setTopUpStep('details');
  };

  const handleExecutePayment = async () => {
    if (paymentGateway === 'easypaisa' || paymentGateway === 'jazzcash') {
      if (phoneNumber.trim().length < 10) {
        Alert.alert('Validation Error', 'Please enter a valid 11-digit mobile wallet number.');
        return;
      }
      if (pinCode.trim().length < 4) {
        Alert.alert('Validation Error', 'Please enter your secure 4-digit MPIN.');
        return;
      }
    } else if (paymentGateway === 'bank') {
      if (!bankName.trim()) {
        Alert.alert('Validation Error', 'Please enter your bank name.');
        return;
      }
      if (accountNumber.trim().length < 8) {
        Alert.alert('Validation Error', 'Please enter a valid account or card number.');
        return;
      }
      if (pinCode.trim().length < 4) {
        Alert.alert('Validation Error', 'Please enter your secure 4-digit card PIN.');
        return;
      }
    }

    setTopUpStep('processing');
    setProcessingMsg('Connecting to secure gateway...');
    
    setTimeout(() => {
      setProcessingMsg(`Verifying your ${paymentGateway === 'bank' ? 'Bank Account' : (paymentGateway === 'easypaisa' ? 'EasyPaisa' : 'JazzCash')} credentials...`);
    }, 800);

    setTimeout(() => {
      setProcessingMsg(`Authorizing Rs. ${amount} transaction charge...`);
    }, 1600);

    setTimeout(async () => {
      setProcessingMsg('Finalizing wallet balance database execution...');
      try {
        const response = await api.post('/wallet/topup', { amount: parseInt(amount) });
        if (response.data.success) {
          await loadUser();
          setTopUpStep('success');
        }
      } catch (err) {
        setTopUpStep('amount');
        Alert.alert('Payment Declined', err.response?.data?.message || 'Transaction failed. Please try again.');
      }
    }, 2400);
  };

  const quickAmounts = [100, 200, 500, 1000];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border, overflow: 'hidden' }]}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000' }} 
          style={[StyleSheet.absoluteFillObject, { opacity: theme.isDark ? 0.25 : 0.15 }]} 
          resizeMode="cover"
        />
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={{ width: 40, height: 40, borderRadius: 12 }} 
          />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Campus Canteen</Text>
            <Text style={[styles.headerSub, { color: theme.textSub }]}>Welcome, {user?.name || (user?.role === 'faculty' ? 'Faculty' : 'Student')}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.inputBg }]}
            onPress={() => router.push('/(student)/cart')}
          >
            <Ionicons name="cart-outline" size={24} color={theme.text} />
            {totalItems > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: theme.accent, borderColor: theme.card }]}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.profileHeaderBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
            {user?.profilePicture ? (
              <Image
                source={{ uri: `${SERVER_BASE_URL}${user.profilePicture}` }}
                style={styles.profileHeaderImage}
              />
            ) : (
              <Ionicons name="person" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.profileTopRow}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={handleAvatarPress} 
              style={styles.avatarWrapper}
            >
              <View style={[styles.avatarBox, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
                {user?.profilePicture ? (
                  <Image
                    source={{ uri: `${SERVER_BASE_URL}${user.profilePicture}` }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={36} color="#fff" />
                )}
                {uploadingPhoto && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
              {/* Mini camera badge */}
              <View style={[styles.cameraBadge, { backgroundColor: theme.accent, borderColor: theme.card }]}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
              <Text style={[styles.profileEmail, { color: theme.textSub }]}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.statLabel, { color: theme.textSub }]}>Wallet Balance</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>Rs. {Math.round(profile.walletBalance).toLocaleString()}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.statLabel, { color: theme.textSub }]}>Total Orders</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{profile.totalOrders}</Text>
            </View>
          </View>
        </View>

        {/* Top Up Wallet */}
        <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setTopUpModal(true)} activeOpacity={0.8}>
          <View style={styles.menuCardLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: theme.isDark ? '#2D2010' : '#FFF0DE' }]}>
              <Ionicons name="wallet-outline" size={22} color="#FF7A00" />
            </View>
            <View>
              <Text style={[styles.menuCardTitle, { color: theme.text }]}>Top Up Wallet</Text>
              <Text style={[styles.menuCardSub, { color: theme.textSub }]}>Add funds to your wallet</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
        </TouchableOpacity>

        {/* Live location */}
        <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => router.push('/(student)/location')} activeOpacity={0.8}>
          <View style={styles.menuCardLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: theme.isDark ? '#1E3A2A' : '#DCFCE7' }]}>
              <Ionicons name="navigate" size={22} color="#22C55E" />
            </View>
            <View>
              <Text style={[styles.menuCardTitle, { color: theme.text }]}>Live location</Text>
              <Text style={[styles.menuCardSub, { color: theme.textSub }]}>Share GPS with canteen admin</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => router.push('/(student)/settings')} activeOpacity={0.8}>
          <View style={styles.menuCardLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: theme.isDark ? '#202530' : '#F3F4F6' }]}>
              <Ionicons name="settings-outline" size={22} color="#6B7280" />
            </View>
            <View>
              <Text style={[styles.menuCardTitle, { color: theme.text }]}>Settings</Text>
              <Text style={[styles.menuCardSub, { color: theme.textSub }]}>Manage your preferences</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
        </TouchableOpacity>

        {/* Logout Card */}
        <TouchableOpacity style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleLogout} activeOpacity={0.8}>
          <View style={styles.menuCardLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: theme.isDark ? '#3A1E1E' : '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.menuCardTitle, { color: theme.text }]}>Logout</Text>
              <Text style={[styles.menuCardSub, { color: theme.textSub }]}>Sign out of your account</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Top-Up Modal */}
      <Modal visible={topUpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

            {/* STEP 1: Amount & Gateway Selection */}
            {topUpStep === 'amount' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 16 }]}>Top Up Wallet</Text>
                
                {/* Modern Virtual Debit Card */}
                <View style={[styles.virtualCard, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Ionicons name="wifi" size={16} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: '90deg' }] }} />
                      <Text style={styles.cardLabel}>CAMPUS WALLET</Text>
                    </View>
                    <Ionicons name="fast-food" size={24} color="#fff" />
                  </View>
                  <Text style={styles.cardBalance}>Rs. {Math.round(profile.walletBalance).toLocaleString()}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardHolderName}>{profile.name.toUpperCase()}</Text>
                    <Text style={styles.cardNumber}>•••• •••• •••• {user?._id?.slice(-4).toUpperCase() || '8472'}</Text>
                  </View>
                </View>

                <View style={styles.quickRow}>
                  {quickAmounts.map(a => {
                    const isSelected = amount === String(a);
                    return (
                      <TouchableOpacity
                        key={a}
                        style={[
                          styles.quickChip,
                          { borderColor: theme.border, backgroundColor: theme.inputBg },
                          isSelected && { borderColor: theme.accent, backgroundColor: theme.accentSoft }
                        ]}
                        onPress={() => setAmount(String(a))}
                      >
                        <Text style={[styles.quickText, { color: theme.textSub }, isSelected && { color: theme.accent, fontWeight: '800' }]}>
                          Rs. {a}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.amountInputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.rsSign, { color: theme.accent }]}>Rs.</Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.text }]}
                    placeholder="Enter amount"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                {/* Gateway Selection */}
                <Text style={[styles.gatewayTitle, { color: theme.text }]}>Select Payment Method</Text>

                {/* EasyPaisa */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.gatewayCard, 
                    { borderColor: theme.border, backgroundColor: theme.inputBg },
                    paymentGateway === 'easypaisa' && { borderColor: '#00A878', borderWidth: 2, backgroundColor: 'rgba(0,168,120,0.05)' }
                  ]}
                  onPress={() => setPaymentGateway('easypaisa')}
                >
                  <View style={styles.gatewayCardLeft}>
                    <View style={[styles.gatewayIconWrap, { backgroundColor: '#E6FAF4' }]}>
                      <Ionicons name="wallet-outline" size={20} color="#00A878" />
                    </View>
                    <View>
                      <Text style={[styles.gatewayName, { color: theme.text }]}>EasyPaisa</Text>
                      <Text style={[styles.gatewayDesc, { color: theme.textSub }]}>Fast mobile wallet transfer</Text>
                    </View>
                  </View>
                  <View style={[styles.circleCheck, { borderColor: theme.border }, paymentGateway === 'easypaisa' && { backgroundColor: '#00A878', borderColor: '#00A878' }]}>
                    {paymentGateway === 'easypaisa' && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                </TouchableOpacity>

                {/* JazzCash */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.gatewayCard, 
                    { borderColor: theme.border, backgroundColor: theme.inputBg },
                    paymentGateway === 'jazzcash' && { borderColor: '#E53E3E', borderWidth: 2, backgroundColor: 'rgba(229,62,62,0.05)' }
                  ]}
                  onPress={() => setPaymentGateway('jazzcash')}
                >
                  <View style={styles.gatewayCardLeft}>
                    <View style={[styles.gatewayIconWrap, { backgroundColor: '#FFF5F5' }]}>
                      <Ionicons name="flash-outline" size={20} color="#E53E3E" />
                    </View>
                    <View>
                      <Text style={[styles.gatewayName, { color: theme.text }]}>JazzCash</Text>
                      <Text style={[styles.gatewayDesc, { color: theme.textSub }]}>Instant mobile wallet checkout</Text>
                    </View>
                  </View>
                  <View style={[styles.circleCheck, { borderColor: theme.border }, paymentGateway === 'jazzcash' && { backgroundColor: '#E53E3E', borderColor: '#E53E3E' }]}>
                    {paymentGateway === 'jazzcash' && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                </TouchableOpacity>

                {/* Bank Account */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.gatewayCard, 
                    { borderColor: theme.border, backgroundColor: theme.inputBg },
                    paymentGateway === 'bank' && { borderColor: theme.accent, borderWidth: 2, backgroundColor: theme.accentSoft }
                  ]}
                  onPress={() => setPaymentGateway('bank')}
                >
                  <View style={styles.gatewayCardLeft}>
                    <View style={[styles.gatewayIconWrap, { backgroundColor: theme.inputBg }]}>
                      <Ionicons name="business-outline" size={20} color={theme.accent} />
                    </View>
                    <View>
                      <Text style={[styles.gatewayName, { color: theme.text }]}>Bank Account / Card</Text>
                      <Text style={[styles.gatewayDesc, { color: theme.textSub }]}>All Pakistani Commercial Banks</Text>
                    </View>
                  </View>
                  <View style={[styles.circleCheck, { borderColor: theme.border }, paymentGateway === 'bank' && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                    {paymentGateway === 'bank' && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: theme.accent, shadowColor: theme.accent, marginTop: 12 }]}
                  onPress={handleProceedToDetails}
                >
                  <Text style={styles.confirmBtnText}>Proceed to Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setTopUpModal(false); setAmount(''); }}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSub }]}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* STEP 2: Gateway Credentials Form */}
            {topUpStep === 'details' && (
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {paymentGateway === 'easypaisa' ? 'EasyPaisa Pay' : (paymentGateway === 'jazzcash' ? 'JazzCash Pay' : 'Bank Authorization')}
                </Text>
                <Text style={[styles.modalSub, { color: theme.textSub }]}>
                  Amount to transfer:{' '}
                  <Text style={{ color: theme.accent, fontWeight: '700' }}>Rs. {amount}</Text>
                </Text>

                {(paymentGateway === 'easypaisa' || paymentGateway === 'jazzcash') ? (
                  <View style={{ marginVertical: 10 }}>
                    <Text style={[styles.label, { color: theme.textSub }]}>Mobile Wallet Account Number</Text>
                    <View style={[styles.amountInputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg, paddingVertical: 10, marginBottom: 14 }]}>
                      <Ionicons name="phone-portrait-outline" size={20} color={theme.textSub} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.inputField, { color: theme.text, fontSize: 16 }]}
                        placeholder="e.g. 03001234567"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        maxLength={11}
                      />
                    </View>

                    <Text style={[styles.label, { color: theme.textSub }]}>Secure 4-Digit Wallet MPIN</Text>
                    <View style={[styles.amountInputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg, paddingVertical: 10, marginBottom: 20 }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={theme.textSub} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.inputField, { color: theme.text, fontSize: 16 }]}
                        placeholder="Enter secure MPIN..."
                        placeholderTextColor={theme.textMuted}
                        secureTextEntry
                        keyboardType="numeric"
                        value={pinCode}
                        onChangeText={setPinCode}
                        maxLength={4}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={{ marginVertical: 10 }}>
                    <Text style={[styles.label, { color: theme.textSub }]}>Bank Name</Text>
                    <View style={[styles.amountInputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg, paddingVertical: 10, marginBottom: 14 }]}>
                      <Ionicons name="business-outline" size={20} color={theme.textSub} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.inputField, { color: theme.text, fontSize: 16 }]}
                        placeholder="e.g. Habib Bank Limited (HBL)"
                        placeholderTextColor={theme.textMuted}
                        value={bankName}
                        onChangeText={setBankName}
                      />
                    </View>

                    <Text style={[styles.label, { color: theme.textSub }]}>Account Number / Card Number</Text>
                    <View style={[styles.amountInputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg, paddingVertical: 10, marginBottom: 14 }]}>
                      <Ionicons name="card-outline" size={20} color={theme.textSub} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.inputField, { color: theme.text, fontSize: 16 }]}
                        placeholder="16-digit Card No or IBAN"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="numeric"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                      />
                    </View>

                    <Text style={[styles.label, { color: theme.textSub }]}>Secure Card PIN / CVV</Text>
                    <View style={[styles.amountInputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg, paddingVertical: 10, marginBottom: 20 }]}>
                      <Ionicons name="key-outline" size={20} color={theme.textSub} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.inputField, { color: theme.text, fontSize: 16 }]}
                        placeholder="Enter secure PIN..."
                        placeholderTextColor={theme.textMuted}
                        secureTextEntry
                        keyboardType="numeric"
                        value={pinCode}
                        onChangeText={setPinCode}
                        maxLength={4}
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#00A878', shadowColor: '#00A878' }]}
                  onPress={handleExecutePayment}
                >
                  <Text style={styles.confirmBtnText}>Authorize Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setTopUpStep('amount')}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSub }]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Real-time processing */}
            {topUpStep === 'processing' && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <ActivityIndicator size="large" color={theme.accent} style={{ transform: [{ scale: 1.5 }], marginBottom: 24 }} />
                <Text style={[styles.processingTitle, { color: theme.text }]}>Processing Secure Transaction</Text>
                <Text style={[styles.processingDesc, { color: theme.textSub }]}>{processingMsg}</Text>
              </View>
            )}

            {/* STEP 4: satisfying Transaction Receipt */}
            {topUpStep === 'success' && (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <View style={[styles.successIconOuter, { backgroundColor: 'rgba(0,168,120,0.1)' }]}>
                  <View style={[styles.successIconInner, { backgroundColor: '#00A878' }]}>
                    <Ionicons name="checkmark" size={40} color="#fff" />
                  </View>
                </View>

                <Text style={[styles.successTitle, { color: theme.text }]}>Transaction Approved!</Text>
                <Text style={[styles.successSub, { color: theme.textSub }]}>Your wallet has been topped up successfully.</Text>

                {/* Receipt Card */}
                <View style={[styles.receiptCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: theme.textSub }]}>Transaction ID</Text>
                    <Text style={[styles.receiptVal, { color: theme.text }]}>TXN-{Math.floor(10000000 + Math.random() * 90000000)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: theme.textSub }]}>Amount Added</Text>
                    <Text style={[styles.receiptVal, { color: '#00A878', fontWeight: '800' }]}>Rs. {amount}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: theme.textSub }]}>Payment Gateway</Text>
                    <Text style={[styles.receiptVal, { color: theme.text, textTransform: 'capitalize' }]}>{paymentGateway}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: theme.textSub }]}>Status</Text>
                    <Text style={[styles.receiptVal, { color: '#00A878', fontWeight: '700' }]}>Success</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: theme.accent, shadowColor: theme.accent, width: '100%' }]}
                  onPress={() => {
                    setTopUpModal(false);
                    setTopUpStep('amount');
                    setAmount('');
                    setPhoneNumber('');
                    setBankName('');
                    setAccountNumber('');
                    setPinCode('');
                  }}
                >
                  <Text style={styles.confirmBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {[
          { icon: 'home', iconOff: 'home-outline', label: 'Home', route: '/(student)/' },
          { icon: 'cart', iconOff: 'cart-outline', label: 'Cart', route: '/(student)/cart', badge: totalItems },
          { icon: 'time', iconOff: 'time-outline', label: 'Orders', route: '/(student)/orders' },
          { icon: 'person', iconOff: 'person-outline', label: 'Profile', route: '/(student)/profile' },
        ].map(tab => {
          const active = tab.label === 'Profile';
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.navItem}
              onPress={() => router.replace(tab.route)}
            >
              <View>
                <Ionicons
                  name={active ? tab.icon : tab.iconOff}
                  size={24}
                  color={active ? theme.accent : theme.textSub}
                />
                {tab.badge > 0 && (
                  <View style={[styles.navBadge, { backgroundColor: theme.accent, borderColor: theme.card }]}>
                    <Text style={styles.navBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, { color: theme.textSub }, active && { color: theme.accent, fontWeight: '700' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerIconBtn: {
    position: 'relative', width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2,
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  profileHeaderBtn: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    overflow: 'hidden',
  },

  // Scroll content
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Profile card
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    width: 76,
    height: 76,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  // Avatar + name/email beside it
  profileTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarBox: {
    width: 76, height: 76, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 16,
  },
  profileHeaderImage: {
    width: 42,
    height: 42,
    borderRadius: 13,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  profileEmail: { fontSize: 13 },

  // Stat boxes side by side
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
  },
  statLabel: { fontSize: 12, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },

  // Menu cards
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  menuCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  menuCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  menuCardSub: { fontSize: 12 },

  // Top-Up Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  modalSub: { fontSize: 14, marginBottom: 20 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  quickChip: {
    flex: 1, minWidth: '22%', paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, alignItems: 'center',
  },
  quickText: { fontSize: 13, fontWeight: '600' },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
  },
  rsSign: { fontSize: 16, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700' },
  confirmBtn: {
    borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 15 },

  // Bottom navigation bar
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 12,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 11, fontWeight: '500' },
  navBadge: {
    position: 'absolute', top: -4, right: -6,
    borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5,
  },
  navBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Simulated gateway styles
  gatewayTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 12,
  },
  gatewayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  gatewayCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gatewayIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayName: {
    fontSize: 13,
    fontWeight: '700',
  },
  gatewayDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  circleCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
  },
  processingTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  processingDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  successIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '950',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
    marginBottom: 20,
  },
  receiptCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  receiptLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Virtual Card Premium Styles
  virtualCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    minHeight: 150,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cardBalance: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHolderName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  cardNumber: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
