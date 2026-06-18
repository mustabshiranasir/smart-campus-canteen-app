import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart, useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SERVER_BASE_URL } from '../../services/api';

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cartItems, updateQty, removeItem, clearCart, subtotal } = useCart();
  const { theme } = useTheme();

  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const totalItems = cartItems.reduce((s, i) => s + i.qty, 0);

  const renderItem = ({ item }) => (
    <View style={[styles.cartItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.itemPrice, { color: theme.accent }]}>Rs. {item.price} each</Text>
      </View>
      <View style={styles.itemRight}>
        <TouchableOpacity onPress={() => removeItem(item.cartItemId)} style={styles.removeBtn}>
          <Ionicons name="close" size={18} color="#FF4444" />
        </TouchableOpacity>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={[styles.qtyBtnOutline, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
            onPress={() => updateQty(item.cartItemId, -1)}
          >
            <Ionicons name="remove" size={16} color={theme.textSub} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: theme.text }]}>{item.qty}</Text>
          <TouchableOpacity
            style={[styles.qtyBtnFilled, { backgroundColor: theme.accent }]}
            onPress={() => updateQty(item.cartItemId, 1)}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

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
            {cartItems.length > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: theme.accent, borderColor: theme.card }]}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
            onPress={() => router.push('/(student)/profile')}
          >
            {user?.profilePicture ? (
              <Image
                source={{ uri: `${SERVER_BASE_URL}${user.profilePicture}` }}
                style={{ width: 42, height: 42 }}
              />
            ) : (
              <Ionicons name="person" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleSection}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Shopping Cart</Text>
          <Text style={[styles.itemCount, { color: theme.textSub }]}>{totalItems} items in your cart</Text>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={clearCart}>
            <Text style={[styles.clearAll, { color: theme.accent }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={item => item.cartItemId || item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="cart-outline" size={44} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your cart is empty</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSub }]}>Start adding items to your cart</Text>
            <TouchableOpacity
              style={[styles.browseBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
              onPress={() => router.push('/(student)/')}
            >
              <Text style={styles.browseBtnText}>Browse Menu</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          cartItems.length > 0 ? (
            <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>Order Summary</Text>
              <Text style={{ color: theme.textSub, fontSize: 12, marginBottom: 10 }}>
                Customize add-ons at checkout before placing your order
              </Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSub }]}>Subtotal ({totalItems} items)</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>Rs. {subtotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSub }]}>Tax (5%)</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>Rs. {tax}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSub }]}>Delivery</Text>
                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>Free</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
                <Text style={[styles.totalValue, { color: theme.accent }]}>Rs. {total}</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderBtn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
                onPress={() => router.push('/(student)/checkout')}
              >
                <Text style={styles.orderBtnText}>Proceed to Checkout</Text>
              </TouchableOpacity>
              <Text style={[styles.pickupNote, { color: theme.textSub }]}>Estimated pickup: 15-20 mins</Text>
            </View>
          ) : null
        }
      />

      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {[
          { icon: 'home',   iconOff: 'home-outline',   label: 'Home',    route: '/(student)/'        },
          { icon: 'cart',   iconOff: 'cart-outline',   label: 'Cart',    route: '/(student)/cart',   badge: totalItems },
          { icon: 'time',   iconOff: 'time-outline',   label: 'Orders',  route: '/(student)/orders'  },
          { icon: 'person', iconOff: 'person-outline', label: 'Profile', route: '/(student)/profile' },
        ].map(tab => {
          const active = tab.label === 'Cart';
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.navItem}
              onPress={() => router.push(tab.route)}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    zIndex: 1000,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerIconBtn: {
    position: 'relative', width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2,
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  profileBtn: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4, overflow: 'hidden',
  },
  titleSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold' },
  itemCount: { fontSize: 13, marginTop: 3 },
  clearAll: { fontSize: 14, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12,
  },
  itemImage: { width: 70, height: 70, borderRadius: 12 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  itemRight: { alignItems: 'center', gap: 12, marginLeft: 10 },
  removeBtn: { padding: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtnOutline: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnFilled: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  emptyCard: {
    alignItems: 'center', padding: 40, borderRadius: 20, borderWidth: 1, marginTop: 20,
  },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, marginBottom: 20 },
  browseBtn: {
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  orderBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  orderBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pickupNote: { textAlign: 'center', fontSize: 12, marginTop: 10 },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1, elevation: 12,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 11, fontWeight: '500' },
  navBadge: {
    position: 'absolute', top: -4, right: -6,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff',
  },
  navBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
