// mobile/app/(student)/checkout.jsx
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, TextInput, Platform, StatusBar, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCart, useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import LiveMapView from '../../components/LiveMapView';
import FoodCustomizeModal from '../../components/FoodCustomizeModal';

// ── Helper: Generate dynamic future time slots ──
const generateTimeSlots = () => {
  const slots = [];
  const now = new Date();
  let minutes = now.getMinutes();
  let hours = now.getHours();
  
  if (minutes < 30) {
    minutes = 30;
  } else {
    minutes = 0;
    hours += 1;
  }
  
  const tempDate = new Date();
  tempDate.setHours(hours, minutes, 0, 0);
  
  for (let i = 0; i < 5; i++) {
    if (tempDate.getTime() >= now.getTime() + 10 * 60 * 1000) {
      const timeStr = tempDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      slots.push(timeStr);
    }
    tempDate.setMinutes(tempDate.getMinutes() + 30);
  }
  return slots.length > 0 ? slots : ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM'];
};

// ── Helper: Validate user selected/entered pickup time ──
const validatePickupTime = (timeStr) => {
  const cleanStr = timeStr.trim().toUpperCase();
  const ampmRegex = /^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/;
  const match = cleanStr.match(ampmRegex);
  
  if (!match) {
    return { valid: true, error: null }; // Allow custom free text if it doesn't match standard formats
  }
  
  let hours = parseInt(match[1], 10);
  let minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { valid: false, error: 'Invalid time format. Please enter a valid time (e.g. 2:30 PM).' };
  }
  
  if (ampm) {
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }
  
  const now = new Date();
  const pickupDate = new Date();
  pickupDate.setHours(hours, minutes, 0, 0);
  
  if (pickupDate.getTime() < now.getTime()) {
    return { 
      valid: false, 
      error: `Pickup time (${timeStr}) cannot be in the past. It is currently ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}.` 
    };
  }
  
  const minRequiredTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 min prep buffer
  if (pickupDate.getTime() < minRequiredTime.getTime()) {
    return {
      valid: false,
      error: `Please choose a pickup time at least 10 minutes in the future so we have time to prepare your order.`
    };
  }
  
  return { valid: true, error: null };
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { cartItems, subtotal, clearCart, fetchCart, updateCartCustomization } = useCart();
  const { user, loadUser } = useAuth();
  const { theme } = useTheme();

  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [pickupTime,    setPickupTime]    = useState('');
  const [note,          setNote]          = useState('');
  const [loading,       setLoading]       = useState(false);
  const [timeSlots]                       = useState(() => generateTimeSlots());
  const [stockError,    setStockError]    = useState('');
  const [stockChecking, setStockChecking] = useState(true);
  const [shareLiveLocation, setShareLiveLocation] = useState(true);
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [customizeTarget, setCustomizeTarget] = useState(null);
  const [foodCatalog, setFoodCatalog] = useState({});

  useEffect(() => {
    const initLocation = async () => {
      try {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Allow location to share live pickup position with admin.');
          setShareLiveLocation(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords(pos.coords);
        setLocationError('');
      } catch {
        setLocationError('Could not read GPS. You can still place the order without live location.');
        setShareLiveLocation(false);
      } finally {
        setLocationLoading(false);
      }
    };
    initLocation();
  }, []);

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        setStockChecking(true);
        const res = await api.get('/food');
        if (res.data.success) {
          setFoodCatalog(Object.fromEntries(res.data.data.map((f) => [f._id, f])));
          let error = '';
          for (let item of cartItems) {
            const dbFood = res.data.data.find(f => f._id === item._id);
            if (!dbFood) {
              error = `Product "${item.name}" not found.`;
              break;
            }
            if (dbFood.status === 'unavailable' || dbFood.stock <= 0) {
              error = `Product "${item.name}" is completely out of stock.`;
              break;
            }
            if (dbFood.stock < item.qty) {
              error = `Product "${item.name}" has insufficient stock (Only ${dbFood.stock} left in stock, you have ${item.qty} in cart).`;
              break;
            }
          }
          setStockError(error);
        }
      } catch (err) {
        console.error('Error checking foods stock:', err);
      } finally {
        setStockChecking(false);
      }
    };

    if (cartItems.length > 0) fetchFoods();
  }, [cartItems]);

  const openCustomize = (item) => {
    const food = foodCatalog[item._id];
    setCustomizeTarget({
      ...item,
      image: item.image,
      extras: food?.extras || [],
      stock: food?.stock ?? 99,
      initialQty: item.qty,
      initialExtras: item.selectedExtras || [],
    });
  };

  const mapRegion = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : null;

  // ── Price calculations ──
  const tax      = Math.round(subtotal * 0.05);
  const total    = subtotal + tax;
  const walletBal = Math.round(user?.walletBalance ?? 0);

  // ── Place order handler ──
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Add items to your cart before checkout.');
      return;
    }
    
    if (stockError) {
      Alert.alert('Insufficient Stock', stockError);
      return;
    }

    if (!pickupTime.trim()) {
      Alert.alert('Missing Info', 'Please select or enter your preferred pickup time.');
      return;
    }

    const timeValidation = validatePickupTime(pickupTime);
    if (!timeValidation.valid) {
      Alert.alert('Invalid Pickup Time', timeValidation.error);
      return;
    }

    // Balance check for wallet payment
    if (paymentMethod === 'wallet' && walletBal < total) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance (Rs. ${walletBal}) is insufficient to cover the total amount (Rs. ${total}). Please top up your wallet first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Top Up Wallet', onPress: () => router.push('/(student)/profile') }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/orders', {
        paymentMethod,
        deliveryAddress: `${pickupTime} ${note}`.trim(),
        shareLiveLocation: shareLiveLocation && !!coords,
        pickupLocation: coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : undefined,
      });

      if (response.data.success) {
        clearCart();
        await loadUser(); // Refresh user wallet balance
        Alert.alert(
          'Order Placed!',
          'Your order has been placed successfully.',
          [{ text: 'View Orders', onPress: () => router.replace('/(student)/orders') }]
        );
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Something went wrong.';
      Alert.alert('Order Error', errorMsg);
      console.error('Order error:', err);
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
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border, overflow: 'hidden' }]}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000' }} 
          style={[StyleSheet.absoluteFillObject, { opacity: theme.isDark ? 0.25 : 0.15 }]} 
          resizeMode="cover"
        />
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.inputBg }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Checkout</Text>
        {/* Spacer to center the title */}
        <View style={{ width: 42 }} />
      </View>

      {/* Scrollable Body */}
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={true}
      >
        {stockError ? (
          <View style={[styles.warningCard, { backgroundColor: theme.isDark ? '#2A1810' : '#FFF5F5', borderColor: theme.isDark ? '#5C2D18' : '#FEE2E2', borderWidth: 1.5, padding: 16, marginBottom: 16 }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={[styles.warningTitle, { color: theme.isDark ? '#FFEBAA' : '#991B1B' }]}>Insufficient Stock</Text>
            </View>
            <Text style={[styles.warningText, { color: theme.isDark ? '#FFEBAA' : '#991B1B' }]}>
              {stockError} Please adjust your quantity in the cart before placing the order.
            </Text>
            <TouchableOpacity 
              style={[styles.topUpBtn, { backgroundColor: '#EF4444', marginTop: 8 }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={14} color="#fff" />
              <Text style={styles.topUpBtnText}>Go back to Cart</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* SECTION 1: Customize items */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Customize your order</Text>
        <Text style={{ color: theme.textSub, fontSize: 12, marginBottom: 10, marginTop: -6 }}>
          Add extra cheese, salad, raita, toppings & more — price updates instantly
        </Text>
        {cartItems.map((item, i) => (
          <View
            key={item.cartItemId || i}
            style={[styles.customCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: theme.text, fontWeight: '700' }]}>
                  {item.qty}× {item.name}
                </Text>
                <Text style={{ color: theme.textSub, fontSize: 12 }}>Base Rs. {item.price}</Text>
                {(item.selectedExtras || []).length > 0 ? (
                  (item.selectedExtras || []).map((ex, j) => (
                    <Text key={j} style={{ color: theme.accent, fontSize: 11, marginTop: 2 }}>
                      + {ex.quantity}× {ex.name} (Rs. {ex.price * ex.quantity})
                    </Text>
                  ))
                ) : (
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                    No add-ons selected — tap Customize
                  </Text>
                )}
              </View>
              <Text style={[styles.itemPrice, { color: theme.accent, fontSize: 16 }]}>
                Rs. {item.lineTotal ?? item.price * item.qty}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.customizeChip, { backgroundColor: theme.accentSoft || theme.inputBg, borderColor: theme.accent }]}
              onPress={() => openCustomize(item)}
            >
              <Ionicons name="options-outline" size={16} color={theme.accent} />
              <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>Customize add-ons</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Order Summary</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Price breakdown */}
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textSub }]}>Subtotal</Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {subtotal}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textSub }]}>Tax (5%)</Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {tax}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textSub }]}>Delivery</Text>
            <Text style={[styles.priceValue, { color: '#22C55E', fontWeight: '700' }]}>Free</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Total */}
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total Amount</Text>
            <Text style={[styles.totalValue, { color: theme.accent }]}>Rs. {total}</Text>
          </View>
        </View>

        {/* SECTION 2: Pickup Time */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Pickup Time</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Preset time slot chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotRow}
          >
            {timeSlots.map(slot => {
              const isActive = pickupTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.slotChip,
                    { borderColor: theme.border, backgroundColor: theme.inputBg },
                    isActive && { backgroundColor: theme.accent, borderColor: theme.accent }
                  ]}
                  onPress={() => setPickupTime(slot)}
                >
                  <Text style={[styles.slotText, { color: theme.textSub }, isActive && { color: '#fff', fontWeight: '700' }]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Manual time input */}
          <View style={[styles.timeInputRow, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
            <Ionicons name="time-outline" size={18} color={theme.textSub} />
            <TextInput
              style={[styles.timeInput, { color: theme.text }]}
              placeholder="Or type a custom time..."
              placeholderTextColor={theme.textMuted}
              value={pickupTime}
              onChangeText={setPickupTime}
            />
          </View>

          {/* Hint */}
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color={theme.textSub} />
            <Text style={[styles.hintText, { color: theme.textSub }]}>Estimated preparation time: 15–20 mins</Text>
          </View>
        </View>

        {/* SECTION: Live location */}
        {paymentMethod !== 'cash' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Live location (optional)</Text>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 0, overflow: 'hidden' }]}>
              {mapRegion && (
                <LiveMapView
                  style={styles.miniMap}
                  region={mapRegion}
                  theme={theme}
                  showsUserLocation
                  markers={[{
                    id: 'pickup',
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    title: 'Your location',
                    pinColor: theme.accent,
                  }]}
                />
              )}
              <View style={{ padding: 16 }}>
                <TouchableOpacity
                  style={styles.payOption}
                  onPress={() => setShareLiveLocation(!shareLiveLocation)}
                  activeOpacity={0.8}
                >
                  <View style={styles.payLeft}>
                    <View style={[styles.payIconBox, { backgroundColor: shareLiveLocation ? '#DCFCE7' : theme.inputBg }]}>
                      <Ionicons name="navigate" size={20} color={shareLiveLocation ? '#22C55E' : theme.textSub} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.payLabel, { color: theme.text }]}>Share live location with admin</Text>
                      <Text style={[styles.paySubLabel, { color: theme.textSub }]}>
                        {locationLoading
                          ? 'Getting GPS…'
                          : coords
                            ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                            : locationError || 'Location unavailable'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radio, { borderColor: theme.border }, shareLiveLocation && { borderColor: '#22C55E' }]}>
                    {shareLiveLocation && <View style={[styles.radioDot, { backgroundColor: '#22C55E' }]} />}
                  </View>
                </TouchableOpacity>
                {locationError ? (
                  <Text style={{ color: '#F59E0B', fontSize: 12, marginTop: 8 }}>{locationError}</Text>
                ) : null}
              </View>
            </View>
          </>
        )}

        {/* SECTION 3: Payment Method */}
        {walletBal < total && (
          <View style={[styles.warningCard, { backgroundColor: theme.isDark ? '#2A1810' : '#FFF3CD', borderColor: theme.isDark ? '#5C2D18' : '#FFEBAA' }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={20} color="#E28743" />
              <Text style={[styles.warningTitle, { color: theme.isDark ? '#FFEBAA' : '#856404' }]}>Insufficient Balance</Text>
            </View>
            <Text style={[styles.warningText, { color: theme.isDark ? '#FFEBAA' : '#856404' }]}>
              Your current wallet balance is Rs. {walletBal.toLocaleString()}, which is less than the total amount of Rs. {total.toLocaleString()}. Please top up your wallet or select "Pay at Counter".
            </Text>
            <TouchableOpacity 
              style={[styles.topUpBtn, { backgroundColor: theme.accent }]}
              onPress={() => router.push('/(student)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.topUpBtnText}>Top Up Wallet</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Method</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Wallet option */}
          <TouchableOpacity
            style={styles.payOption}
            onPress={() => setPaymentMethod('wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.payLeft}>
              <View style={[
                styles.payIconBox,
                paymentMethod === 'wallet'
                  ? { backgroundColor: theme.accent }
                  : { backgroundColor: theme.isDark ? '#2D2010' : '#FFF0DE' }
              ]}>
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={paymentMethod === 'wallet' ? '#fff' : theme.accent}
                />
              </View>
              <View>
                <Text style={[styles.payLabel, { color: theme.text }]}>Campus Wallet</Text>
                <Text style={[styles.paySubLabel, { color: theme.textSub }]}>Balance: Rs. {walletBal.toLocaleString()}</Text>
              </View>
            </View>
            {/* Radio button */}
            <View style={[styles.radio, { borderColor: theme.border }, paymentMethod === 'wallet' && { borderColor: theme.accent }]}>
              {paymentMethod === 'wallet' && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
            </View>
          </TouchableOpacity>

          <View style={[styles.payDivider, { backgroundColor: theme.border }]} />

          {/* Cash option */}
          <TouchableOpacity
            style={styles.payOption}
            onPress={() => {
              setPaymentMethod('cash');
              setShareLiveLocation(false);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.payLeft}>
              <View style={[
                styles.payIconBox,
                paymentMethod === 'cash'
                  ? { backgroundColor: theme.accent }
                  : { backgroundColor: theme.isDark ? '#2D2010' : '#FFF0DE' }
              ]}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={paymentMethod === 'cash' ? '#fff' : theme.accent}
                />
              </View>
              <View>
                <Text style={[styles.payLabel, { color: theme.text }]}>Pay at Counter</Text>
                <Text style={[styles.paySubLabel, { color: theme.textSub }]}>Cash on pickup</Text>
              </View>
            </View>
            <View style={[styles.radio, { borderColor: theme.border }, paymentMethod === 'cash' && { borderColor: theme.accent }]}>
              {paymentMethod === 'cash' && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 4: Special Instructions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Special Instructions</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.noteInputRow}>
            <Ionicons name="create-outline" size={18} color={theme.textSub} style={{ marginTop: 2 }} />
            <TextInput
              style={[styles.noteInput, { color: theme.text }]}
              placeholder="Any special requests? (optional)"
              placeholderTextColor={theme.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Bottom spacing so content clears the sticky footer */}
        <View style={{ height: 110 }} />
      </ScrollView>

      <FoodCustomizeModal
        visible={!!customizeTarget}
        food={customizeTarget}
        theme={theme}
        mode="edit"
        onClose={() => setCustomizeTarget(null)}
        onAdd={async (_food, qty, selectedExtras) => {
          const cartItemId = customizeTarget?.cartItemId;
          if (!cartItemId) return;
          const ok = await updateCartCustomization(cartItemId, qty, selectedExtras);
          if (ok) await fetchCart();
          setCustomizeTarget(null);
        }}
      />

      {/* Sticky Footer */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={styles.footerLeft}>
          <Text style={[styles.footerLabel, { color: theme.textSub }]}>Total</Text>
          <Text style={[styles.footerAmount, { color: theme.text }]}>Rs. {total}</Text>
        </View>

        <TouchableOpacity
          style={[styles.orderBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }, (loading || !!stockError) && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={loading || !!stockError}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.orderBtnInner}>
              <Text style={styles.orderBtnText}>{stockError ? 'Insufficient Stock' : 'Place Order'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
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
  backBtn: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },

  // Body
  body: { padding: 16 },

  // Section title
  sectionTitle: {
    fontSize: 15, fontWeight: '800',
    marginBottom: 10, marginTop: 6, letterSpacing: -0.2,
  },

  // Generic card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  warningCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  topUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  topUpBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  // Order items
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  itemLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  qtyBadge: {
    borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
    minWidth: 34, alignItems: 'center',
  },
  qtyBadgeText: { fontWeight: '800', fontSize: 12 },
  itemName:  { fontSize: 14, fontWeight: '500', flex: 1 },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  customCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  customizeChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  miniMap: { height: 160, width: '100%' },

  // Price rows
  divider:    { height: 1, marginVertical: 12 },
  priceRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14 },
  priceValue: { fontSize: 14, fontWeight: '500' },
  totalLabel: { fontSize: 15, fontWeight: '800' },
  totalValue: { fontSize: 15, fontWeight: '800' },

  // Pickup time slots
  slotRow: { gap: 8, paddingBottom: 12 },
  slotChip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5,
  },
  slotText: { fontSize: 13, fontWeight: '600' },

  // Manual time input
  timeInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 4,
  },
  timeInput: { flex: 1, fontSize: 14 },

  // Hint row
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  hintText: { fontSize: 12 },

  // Payment options
  payOption: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
  },
  payDivider: { height: 1 },
  payLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  payIconBox: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  payLabel:    { fontSize: 15, fontWeight: '600' },
  paySubLabel: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot:    { width: 11, height: 11, borderRadius: 6 },

  // Special instructions
  noteInputRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  noteInput: {
    flex: 1, fontSize: 14,
    minHeight: 70, lineHeight: 20,
  },

  // Sticky footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 12,
  },
  footerLeft:   {},
  footerLabel:  { fontSize: 12, marginBottom: 2 },
  footerAmount: { fontSize: 22, fontWeight: '800' },
  orderBtn: {
    borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  orderBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderBtnText:  { color: '#fff', fontWeight: '800', fontSize: 16 },
});
