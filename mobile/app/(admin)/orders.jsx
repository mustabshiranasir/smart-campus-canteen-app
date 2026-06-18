// mobile/app/(admin)/orders.jsx
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, ActivityIndicator,
  Dimensions, Platform, StatusBar, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_BASE_URL } from '../../services/api';
import NotificationDrawer from '../../components/NotificationDrawer';
import { useTheme } from '../../context/ThemeContext';

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirm = window.confirm(`${title}\n\n${message}`);
      if (confirm) {
        const okButton = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];
        if (okButton && okButton.onPress) okButton.onPress();
      } else {
        const cancelButton = buttons.find(b => b.style === 'cancel');
        if (cancelButton && cancelButton.onPress) cancelButton.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (buttons && buttons[0] && buttons[0].onPress) buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const STATUS_FLOW = {
  pending:   { next: 'preparing', nextLabel: 'Start Preparing', nextColor: '#3B82F6', nextBg: '#EFF6FF', icon: 'play-circle-outline' },
  preparing: { next: 'ready',     nextLabel: 'Mark as Ready',   nextColor: '#22C55E', nextBg: '#DCFCE7', icon: 'checkmark-circle-outline' },
  ready:     { next: 'delivered', nextLabel: 'Mark Delivered',  nextColor: '#6B7280', nextBg: '#F3F4F6', icon: 'bag-check-outline' },
  delivered: { next: null, nextLabel: null, nextColor: null, nextBg: null, icon: null },
  completed: { next: null, nextLabel: null, nextColor: null, nextBg: null, icon: null },
  cancelled: { next: null, nextLabel: null, nextColor: null, nextBg: null, icon: null },
};

const STATUS_BADGE = {
  pending:   { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending'   },
  preparing: { color: '#3B82F6', bg: '#EFF6FF', label: 'Preparing' },
  ready:     { color: '#22C55E', bg: '#DCFCE7', label: 'Ready'     },
  delivered: { color: '#6B7280', bg: '#F3F4F6', label: 'Delivered' },
  completed: { color: '#16A34A', bg: '#DCFCE7', label: 'Completed' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'Cancelled' },
};

const FILTER_TABS = ['all', 'pending', 'preparing', 'ready', 'delivered', 'completed'];

const ACTIVE_STATUSES = ['pending', 'preparing', 'ready'];

const FACULTY_THEME = {
  border: '#F59E0B',
  cardBg: '#FFFBEB',
  cardBgDark: '#2D2208',
  rowBg: '#FEF3C7',
  rowBgDark: '#3D2E0A',
  accent: '#D97706',
  label: '#92400E',
  labelDark: '#FDE68A',
};

const sortOrdersByPriority = (orders) =>
  [...orders].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status);
    const bActive = ACTIVE_STATUSES.includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (aActive && bActive) {
      const priorityDiff = (a.priority ?? 2) - (b.priority ?? 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

const sortFilteredList = (list) =>
  [...list].sort((a, b) => {
    const priorityDiff = (a.priority ?? 2) - (b.priority ?? 2);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

function OrderCard({ order, onStatusUpdate, queueIndex, onTrackLocation }) {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isFaculty = order.priority === 1;
  const showTrackLocation = order.status === 'ready' && (order.shareLiveLocation || order.pickupLocation);

  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
  const flow  = STATUS_FLOW[order.status] || STATUS_FLOW.pending;

  const t = new Date(order.createdAt);
  const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleUpdate = async () => {
    if (!flow.next) return;
    setLoading(true);
    try {
      await api.patch(`/orders/${order._id}/status`, { status: flow.next });
      onStatusUpdate(order._id, flow.next);
    } catch {
      showAlert('Error', 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    showAlert('Cancel Order', `Are you sure you want to cancel Order #${order._id.slice(-6).toUpperCase()}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await api.patch(`/orders/${order._id}/status`, { status: 'cancelled' });
            showAlert('Success', 'Order has been cancelled successfully.');
            onStatusUpdate(order._id, 'cancelled');
          } catch { showAlert('Error', 'Failed to cancel order'); }
        }
      },
    ]);
  };

  const facultyLabelColor = theme.isDark ? FACULTY_THEME.labelDark : FACULTY_THEME.label;

  return (
    <View style={[
      styles.card,
      { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
      isFaculty && {
        borderLeftWidth: 5,
        borderLeftColor: FACULTY_THEME.border,
        backgroundColor: theme.isDark ? FACULTY_THEME.cardBgDark : FACULTY_THEME.cardBg,
        borderColor: '#FCD34D',
      },
    ]}>
      {isFaculty && ACTIVE_STATUSES.includes(order.status) && queueIndex != null && (
        <View style={[styles.queueStrip, { backgroundColor: FACULTY_THEME.border }]}>
          <Ionicons name="school" size={14} color="#fff" />
          <Text style={styles.queueStripText}>
            Faculty priority · #{queueIndex} in queue
          </Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.orderId, { color: isFaculty ? facultyLabelColor : theme.text }]}>
              Order #{order._id.slice(-6).toUpperCase()}
            </Text>
            {isFaculty && (
              <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7', borderColor: FACULTY_THEME.border }]}>
                <Ionicons name="flash" size={11} color={FACULTY_THEME.accent} />
                <Text style={styles.priorityBadgeText}>Faculty</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={theme.textSub} />
            <Text style={[styles.metaText, { color: theme.textSub }]}>{timeStr} • Pickup: {order.pickupTime}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={[
        styles.customerRow,
        { backgroundColor: isFaculty ? (theme.isDark ? FACULTY_THEME.rowBgDark : FACULTY_THEME.rowBg) : theme.inputBg },
      ]}>
        <View style={[styles.customerAvatar, { backgroundColor: isFaculty ? FACULTY_THEME.accent : theme.accent, overflow: 'hidden' }]}>
          {order.customerProfilePicture ? (
            <Image
              source={{ uri: `${SERVER_BASE_URL}${order.customerProfilePicture}` }}
              style={{ width: 38, height: 38, borderRadius: 19 }}
            />
          ) : (
            <Text style={styles.customerAvatarText}>
              {order.customer ? order.customer.charAt(0).toUpperCase() : 'C'}
            </Text>
          )}
        </View>
        <View>
          <Text style={[styles.customerLabel, { color: theme.textSub }]}>
            {isFaculty ? 'Faculty customer' : 'Customer'}
          </Text>
          <Text style={[styles.customerName, { color: theme.text }]}>{order.customer || 'Unknown'}</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={[styles.amountLabel, { color: theme.textSub }]}>Total Amount</Text>
          <Text style={[styles.amountValue, { color: theme.accent }]}>Rs. {order.totalAmount}</Text>
        </View>
      </View>

      {/* Items list */}
      <View style={styles.itemsSection}>
        {order.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item.qty}x {item.name}</Text>
              {(item.extras || []).map((ex, j) => (
                <Text key={j} style={{ color: theme.textSub, fontSize: 11 }}>
                  + {ex.quantity}× {ex.name}
                </Text>
              ))}
            </View>
            <Text style={[styles.itemPrice, { color: theme.text }]}>
              Rs. {item.lineTotal ?? item.price * item.qty}
            </Text>
          </View>
        ))}
      </View>

      {showTrackLocation && (
        <TouchableOpacity
          style={[styles.trackLocationBtn, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}
          onPress={() => onTrackLocation?.(order)}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={18} color="#3B82F6" />
          <Text style={styles.trackLocationText}>Track location for delivery</Text>
          <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
        </TouchableOpacity>
      )}

      {order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'cancelled' && (
        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          {flow.next && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: flow.nextBg, flex: 1 }]}
              onPress={handleUpdate} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color={flow.nextColor} />
                : <>
                    <Ionicons name={flow.icon} size={18} color={flow.nextColor} />
                    <Text style={[styles.actionBtnText, { color: flow.nextColor }]}>{flow.nextLabel}</Text>
                  </>
              }
            </TouchableOpacity>
          )}
          {order.status !== 'ready' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function AdminOrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Sync active tab filter if passed as a query param from the dashboard links
  useEffect(() => {
    if (params.filter) {
      setFilter(params.filter);
    }
  }, [params.filter]);

  const fetchOrders = async (showLoading = true) => {
    try {
      const res = await api.get('/orders');
      if (res.data.success) {
        const formatted = sortOrdersByPriority(res.data.data.map(order => ({
          _id: order._id,
          status: order.status,
          priority: order.priority ?? (order.userId?.role === 'faculty' ? 1 : 2),
          customerRole: order.userId?.role || 'student',
          createdAt: order.createdAt,
          pickupTime: order.deliveryAddress || 'Immediate',
          customer: order.userId?.name || 'Student',
          customerId: order.userId?._id || order.userId,
          customerProfilePicture: order.userId?.profilePicture || null,
          shareLiveLocation: order.shareLiveLocation,
          pickupLocation: order.pickupLocation,
          totalAmount: order.totalAmount,
          items: order.items.map(item => ({
            name: item.productId?.name || 'Deleted Item',
            qty: item.quantity,
            price: item.price,
            lineTotal: item.lineTotal ?? item.price * item.quantity,
            extras: item.selectedExtras || [],
          }))
        })));
        setOrders(formatted);
      }
    } catch (err) {
      console.log('Error fetching orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(false);
    setRefreshing(false);
  };

  const handleStatusUpdate = (orderId, newStatus) => {
    setOrders(prev =>
      sortOrdersByPriority(prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const { width: screenWidth } = Dimensions.get('window');
  const isPhone = screenWidth < 768;

  const filtered = filter === 'all'
    ? orders
    : sortFilteredList(orders.filter(o => o.status === filter));

  const facultyPendingCount = orders.filter(o => o.priority === 1 && o.status === 'pending').length;
  const counts   = FILTER_TABS.reduce((acc, f) => {
    acc[f] = f === 'all' ? orders.length : orders.filter(o => o.status === f).length;
    return acc;
  }, {});

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
            <Text style={[styles.headerSub, { color: theme.textSub }]}>
              Faculty orders shown first (amber highlight)
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <NotificationDrawer theme={theme} />
          <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.inputBg }]} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {facultyPendingCount > 0 && (
        <View style={[styles.legendBar, { backgroundColor: theme.isDark ? FACULTY_THEME.cardBgDark : FACULTY_THEME.cardBg, borderColor: '#FCD34D' }]}>
          <View style={[styles.legendDot, { backgroundColor: FACULTY_THEME.border }]} />
          <Text style={[styles.legendText, { color: theme.isDark ? FACULTY_THEME.labelDark : FACULTY_THEME.label }]}>
            {facultyPendingCount} faculty order{facultyPendingCount > 1 ? 's' : ''} waiting — handle these before student orders
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={[styles.filterBar, { backgroundColor: theme.card }]} 
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}>
          {FILTER_TABS.map(f => {
            const active = filter === f;
            const badge  = counts[f];
            return (
              <TouchableOpacity 
                key={f} 
                style={[
                  styles.filterChip, 
                  { borderColor: theme.border, backgroundColor: theme.card },
                  active && { backgroundColor: theme.accent, borderColor: theme.accent }
                ]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, { color: theme.textSub }, active && { color: '#fff', fontWeight: '800' }]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
                {badge > 0 && (
                  <View style={[styles.filterBadge, active ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: theme.accent }]}>
                    <Text style={styles.filterBadgeText}>{badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={60} color={theme.textSub} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No orders</Text>
          <Text style={[styles.emptyText, { color: theme.textSub }]}>No {filter === 'all' ? '' : filter} orders right now</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
          {filtered.map((order, index) => {
            const facultyQueueIndex = order.priority === 1 && ACTIVE_STATUSES.includes(order.status)
              ? filtered.slice(0, index + 1).filter(o => o.priority === 1 && ACTIVE_STATUSES.includes(o.status)).length
              : null;
            return (
              <OrderCard
                key={order._id}
                order={order}
                queueIndex={facultyQueueIndex}
                onStatusUpdate={handleStatusUpdate}
                onTrackLocation={(o) => router.push({
                  pathname: '/(admin)/locations',
                  params: {
                    focusUserId: o.customerId?.toString?.() || String(o.customerId),
                    customerName: o.customer || 'Customer',
                  },
                })}
              />
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── Bottom Navigation ── */}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {[
          { icon: 'grid',       iconO: 'grid-outline',       label: 'Dashboard', active: false, route: '/(admin)/dashboard' },
          { icon: 'bag-handle', iconO: 'bag-handle-outline', label: 'Orders',    active: true,  route: '/(admin)/orders' },
          { icon: 'cube',       iconO: 'cube-outline',       label: 'Menu',      active: false, route: '/(admin)/menu' },
          { icon: 'settings',   iconO: 'settings-outline',   label: 'Settings',  active: false, route: '/(admin)/settings' },
        ].map(n => (
          <TouchableOpacity
            key={n.label}
            style={styles.bottomNavItem}
            onPress={() => n.route && router.replace(n.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={n.active ? n.icon : n.iconO}
              size={22}
              color={n.active ? theme.accent : theme.textSub}
            />
            <Text style={[styles.bottomNavLabel, { color: theme.textSub }, n.active && { color: theme.accent, fontWeight: '700' }]}>
              {n.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 16, paddingHorizontal: 16,
                     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 99999, elevation: 10, borderBottomWidth: 1 },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:         { width: 36, height: 36, borderRadius: 18,
                     alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 17, fontWeight: '800' },
  headerSub:       { fontSize: 12 },
  refreshBtn:      { width: 36, height: 36, borderRadius: 18,
                     alignItems: 'center', justifyContent: 'center' },
  legendBar:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16,
                     marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  legendDot:       { width: 10, height: 10, borderRadius: 5 },
  legendText:      { flex: 1, fontSize: 12, fontWeight: '700' },
  queueStrip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8,
                     paddingHorizontal: 12, borderTopLeftRadius: 14, borderTopRightRadius: 14,
                     marginBottom: 12, marginTop: -4, marginHorizontal: -4 },
  queueStripText:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  priorityBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8,
                     paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  priorityBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  filterBar:       { borderBottomWidth: 0 },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14,
                     paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterChipActive:{ },
  filterText:      { fontSize: 13, fontWeight: '600' },
  filterTextActive:{ color: '#fff' },
  filterBadge:     { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  list:            { padding: 16, gap: 14 },
  card:            { borderRadius: 18, padding: 16,
                     shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  orderId:         { fontSize: 17, fontWeight: '800' },
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText:        { fontSize: 11 },
  badge:           { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText:       { fontSize: 12, fontWeight: '700' },
  customerRow:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                     borderRadius: 12, padding: 12, marginBottom: 14 },
  customerAvatar:  { width: 38, height: 38, borderRadius: 19,
                     alignItems: 'center', justifyContent: 'center' },
  customerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  customerLabel:   { fontSize: 11 },
  customerName:    { fontSize: 14, fontWeight: '700' },
  amountBox:       { marginLeft: 'auto', alignItems: 'flex-end' },
  amountLabel:     { fontSize: 11 },
  amountValue:     { fontSize: 16, fontWeight: '800' },
  itemsSection:    { marginBottom: 14, gap: 6 },
  itemRow:         { flexDirection: 'row', justifyContent: 'space-between' },
  itemName:        { fontSize: 14 },
  itemPrice:       { fontSize: 14, fontWeight: '600' },
  trackLocationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 12, paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5,
  },
  trackLocationText: { color: '#3B82F6', fontSize: 14, fontWeight: '700', flex: 1 },
  actions:         { flexDirection: 'row', gap: 10, paddingTop: 12,
                     borderTopWidth: 1 },
  actionBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                     borderRadius: 12, paddingVertical: 12 },
  actionBtnText:   { fontSize: 14, fontWeight: '700' },
  cancelBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12,
                     paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#fee2e2' },
  cancelBtnText:   { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:      { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyText:       { fontSize: 14, marginTop: 6 },

  /* ── Bottom Nav ── */
  bottomNav: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 14 : 0,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomNavLabelActive: {
    fontWeight: '700',
  },
});
