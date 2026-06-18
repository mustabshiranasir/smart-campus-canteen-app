import { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, RefreshControl, ActivityIndicator, Platform, StatusBar, Alert, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart, useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { SERVER_BASE_URL } from '../../services/api';
import NotificationDrawer from '../../components/NotificationDrawer';

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

// ─────────────────────────────────────────────
// Status badge config: background + text color
// ─────────────────────────────────────────────
const STATUS_CONFIG = {
    pending:   { label: 'Pending',   color: '#F59E0B', bg: '#FEF3C7' },
    preparing: { label: 'Preparing', color: '#F59E0B', bg: '#FEF3C7' },
    ready:     { label: 'Ready',     color: '#22C55E', bg: '#DCFCE7' },
    delivered: { label: 'Delivered', color: '#6B7280', bg: '#F3F4F6' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
};

// ─────────────────────────────────────────────
// Bottom banner shown inside each order card
// based on current order status
// ─────────────────────────────────────────────
const STATUS_BANNER = {
    pending:   { text: 'Your order has been received',                color: '#F59E0B', bg: '#FEF3C7' },
    preparing: { text: 'Your order is being prepared',                color: '#FF7A00', bg: '#FFF3E8' },
    ready:     { text: 'Your order is ready for pickup at Counter #3', color: '#22C55E', bg: '#DCFCE7' },
};

// ─────────────────────────────────────────────
// Mock data used when API call fails
// ─────────────────────────────────────────────
const MOCK_ORDERS = [
    {
        _id: 'ORD-1042', createdAt: '2026-04-24T12:30:00Z',
        status: 'ready', pickupTime: '12:45 PM', totalAmount: 600,
        items: [
            { name: 'Chicken Burger', qty: 2, price: 250 },
            { name: 'Cold Coffee',    qty: 1, price: 100 },
        ],
    },
    {
        _id: 'ORD-1041', createdAt: '2026-04-24T10:15:00Z',
        status: 'preparing', pickupTime: '10:30 AM', totalAmount: 300,
        items: [
            { name: 'Veggie Wrap',  qty: 1, price: 180 },
            { name: 'Mango Shake',  qty: 1, price: 120 },
        ],
    },
    {
        _id: 'ORD-1040', createdAt: '2026-04-23T14:00:00Z',
        status: 'delivered', pickupTime: '2:20 PM', totalAmount: 150,
        items: [
            { name: 'Pizza Slice', qty: 1, price: 150 },
        ],
    },
];

// ─────────────────────────────────────────────
// OrderCard — renders a single order as a card
// ─────────────────────────────────────────────
function OrderCard({ order, onRefresh }) {
    const { theme } = useTheme();
    const { loadUser } = useAuth();

    // Resolve status display config (badge color etc.)
    const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

    // Resolve bottom banner (only shown for active statuses)
    const banner = STATUS_BANNER[order.status];

    // Format createdAt date/time for display
    const date    = new Date(order.createdAt);
    const dateStr = date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

    const handleCancel = () => {
        showAlert('Cancel Order', 'Are you sure you want to cancel this order?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel', style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await api.patch(`/orders/${order._id}/status`, { status: 'cancelled' });
                        if (res.data.success) {
                            showAlert('Success', 'Order cancelled successfully.');
                            await loadUser(); // Refresh wallet balance
                            if (onRefresh) onRefresh();
                        }
                    } catch (err) {
                        showAlert('Error', err.response?.data?.message || 'Failed to cancel order');
                    }
                }
            }
        ]);
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>

            {/* ── Card Header: Order ID + Status Badge (left) | Total (right) ── */}
            <View style={styles.cardHeader}>

                {/* Left: order ID, status badge, date */}
                <View style={styles.cardHeaderLeft}>
                    <View style={styles.orderIdRow}>
                        <Text style={[styles.orderId, { color: theme.text }]}>Order #{order._id.slice(-6).toUpperCase()}</Text>
                        {order.priority === 1 && order.status === 'pending' && (
                            <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="flash" size={10} color="#D97706" />
                                <Text style={styles.priorityBadgeText}>High Priority</Text>
                            </View>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                        </View>
                    </View>
                    <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={13} color={theme.textSub} />
                        <Text style={[styles.dateText, { color: theme.textSub }]}>{dateStr} • {timeStr}</Text>
                    </View>
                </View>

                {/* Right: total label + bold amount */}
                <View style={styles.cardHeaderRight}>
                    <Text style={[styles.totalLabel, { color: theme.textSub }]}>Total</Text>
                    <Text style={[styles.totalAmount, { color: theme.text }]}>Rs. {order.totalAmount}</Text>
                </View>

            </View>

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* ── Order Items Section ── */}
            <Text style={[styles.itemsSectionLabel, { color: theme.textSub }]}>ORDER ITEMS</Text>
            {order.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: theme.text }]}>{item.qty}× {item.name}</Text>
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

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* ── Card Footer: Pickup Time (left) | View Details / Cancel (right) ── */}
            <View style={styles.cardFooter}>

                {/* Pickup time with location icon */}
                <View style={styles.pickupCol}>
                    <View style={styles.pickupLabelRow}>
                        <Ionicons name="location-outline" size={14} color={theme.textSub} />
                        <Text style={[styles.pickupLabel, { color: theme.textSub }]}>Pickup Time</Text>
                    </View>
                    <Text style={[styles.pickupTime, { color: theme.text }]}>{order.pickupTime}</Text>
                </View>

                {/* Right actions: Cancel Button (if pending) / Details Link */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {order.status === 'pending' && (
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderColor: '#EF4444',
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                            }}
                            onPress={handleCancel}
                        >
                            <Ionicons name="close-circle-outline" size={14} color="#EF4444" style={{ marginRight: 2 }} />
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity>
                        <Text style={[styles.viewDetails, { color: theme.accent }]}>View Details</Text>
                    </TouchableOpacity>
                </View>

            </View>

            {/* ── Status Banner (only for pending / preparing / ready) ── */}
            {order.priority === 1 && order.status === 'pending' && (
                <View style={[styles.statusBanner, { backgroundColor: '#FFFBEB' }]}>
                    <View style={[styles.bannerDot, { backgroundColor: '#D97706' }]} />
                    <Text style={[styles.bannerText, { color: '#92400E' }]}>
                        Faculty order — you are in the high-priority queue
                    </Text>
                </View>
            )}

            {banner && (
                <View style={[styles.statusBanner, { backgroundColor: banner.bg }]}>
                    <View style={[styles.bannerDot, { backgroundColor: banner.color }]} />
                    <Text style={[styles.bannerText, { color: banner.color }]}>{banner.text}</Text>
                </View>
            )}

        </View>
    );
}

// ─────────────────────────────────────────────
// OrdersScreen — main screen component
// ─────────────────────────────────────────────
export default function OrdersScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { totalItems } = useCart();
    const { theme } = useTheme();

    const [orders,     setOrders]     = useState(MOCK_ORDERS);
    const [loading,    setLoading]    = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // ── Fetch orders from API (falls back to mock data on error) ──
    const fetchOrders = useCallback(async (showSpinner = false) => {
        try {
            if (showSpinner) setLoading(true);
            const res = await api.get('/orders');
            if (res.data.success) {
                // Map active orders only (excluding cancelled and delivered)
                const activeOrders = res.data.data
                    .filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
                    .map(o => ({
                        _id: o._id,
                        createdAt: o.createdAt,
                        status: o.status,
                        priority: o.priority ?? (user?.role === 'faculty' ? 1 : 2),
                        pickupTime: o.deliveryAddress,
                        totalAmount: o.totalAmount,
                        items: o.items.map(i => ({
                            name: i.productId?.name || 'Unknown Item',
                            qty: i.quantity,
                            price: i.price,
                            lineTotal: i.lineTotal ?? i.price * i.quantity,
                            extras: i.selectedExtras || [],
                        }))
                    }));
                setOrders(activeOrders);
            }
        } catch (error) {
            console.error('Fetch orders error:', error);
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, [user?.role]);

    // Fetch on mount and start polling
    useEffect(() => {
        fetchOrders(true); // Initial load with spinner

        const interval = setInterval(() => {
            fetchOrders(false); // Background poll without spinner
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchOrders]);

    // Pull-to-refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOrders(false);
        setRefreshing(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <StatusBar
                barStyle={theme.isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.card}
            />

            {/* TOP HEADER */}
            <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000' }} 
                  style={[StyleSheet.absoluteFillObject, { opacity: theme.isDark ? 0.25 : 0.15 }]} 
                  resizeMode="cover"
                />
                {/* Left: logo + app name + greeting */}
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

                {/* Right: cart icon with badge + profile button */}
                <View style={styles.headerRight}>
                    <NotificationDrawer theme={theme} />
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

            {/* SCROLLABLE MAIN CONTENT */}
            <ScrollView
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={true}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.accent]}
                        tintColor={theme.accent}
                    />
                }
            >

                {/* Page Title & Count Info */}
                <View style={styles.titleSection}>
                    <Text style={[styles.pageTitle, { color: theme.text }]}>Active Orders</Text>
                    <Text style={[styles.pageSub, { color: theme.textSub }]}>
                        {orders.length === 0
                            ? 'No current orders'
                            : `You have ${orders.length} orders in progress`}
                    </Text>
                </View>

                {/* Loading indicator */}
                {loading && !refreshing && (
                    <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
                )}

                {/* Order List */}
                {!loading && orders.map(order => (
                    <OrderCard key={order._id} order={order} onRefresh={() => fetchOrders(false)} />
                ))}

                {/* Empty State when no orders are found */}
                {!loading && orders.length === 0 && (
                    <View style={styles.empty}>
                        <Ionicons name="document-text-outline" size={64} color={theme.textMuted} />
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No orders yet</Text>
                        <Text style={[styles.emptyText, { color: theme.textSub }]}>
                            It looks like you haven't placed any orders. Start browsing the menu to place your first one!
                        </Text>
                        <TouchableOpacity
                            style={[styles.browseBtn, { backgroundColor: theme.accent }]}
                            onPress={() => router.push('/(student)/')}
                        >
                            <Text style={styles.browseBtnText}>Order Food Now</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 100 }} />

            </ScrollView>

            {/* BOTTOM NAVIGATION BAR */}
            <View style={[styles.bottomNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                {[
                    { icon: 'home',   iconOff: 'home-outline',   label: 'Home',    route: '/(student)/'        },
                    { icon: 'cart',   iconOff: 'cart-outline',   label: 'Cart',    route: '/(student)/cart',   badge: totalItems },
                    { icon: 'time',   iconOff: 'time-outline',   label: 'Orders',  route: '/(student)/orders'  },
                    { icon: 'person', iconOff: 'person-outline', label: 'Profile', route: '/(student)/profile' },
                ].map(tab => {
                    const active = tab.label === 'Orders';
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

    // ── Header ──
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
    headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoBox: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
    headerSub:   { fontSize: 12, marginTop: 1 },
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
    profileBtn: {
        width: 42, height: 42, borderRadius: 13,
        alignItems: 'center', justifyContent: 'center',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
        overflow: 'hidden',
    },

    // ── Page title (inside scroll) ──
    titleSection: { paddingHorizontal: 4, paddingTop: 20, paddingBottom: 16 },
    pageTitle:    { fontSize: 24, fontWeight: 'bold' },
    pageSub:      { fontSize: 13, marginTop: 3 },

    // ── Scrollable list padding ──
    list: {
        paddingHorizontal: 16,
        paddingTop: 0,
    },

    // ── Order card ──
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

    // Card header row
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardHeaderLeft:  { flex: 1 },
    cardHeaderRight: { alignItems: 'flex-end' },

    // Order ID + status badge
    orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' },
    priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    priorityBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
    orderId:    { fontSize: 16, fontWeight: '800' },
    statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    statusText:  { fontSize: 12, fontWeight: '700' },

    // Date/time row
    dateRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dateText: { fontSize: 12 },

    // Total amount
    totalLabel:  { fontSize: 12, marginBottom: 2 },
    totalAmount: { fontSize: 20, fontWeight: '800' },

    // Divider line
    divider: { height: 1, marginVertical: 12 },

    // Order items section
    itemsSectionLabel: {
        fontSize: 11, fontWeight: '700',
        letterSpacing: 0.8, marginBottom: 10,
    },
    itemRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    itemName:  { fontSize: 14 },
    itemPrice: { fontSize: 14, fontWeight: '600' },

    // Card footer
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    pickupCol:      {},
    pickupLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
    pickupLabel:    { fontSize: 12 },
    pickupTime:     { fontSize: 15, fontWeight: '700' },
    viewDetails:    { fontSize: 14, fontWeight: '700' },

    // Status banner at bottom of card
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginTop: 12, borderRadius: 10, padding: 12,
    },
    bannerDot:  { width: 8, height: 8, borderRadius: 4 },
    bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // ── Empty state ──
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
    emptyText:  { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    browseBtn: {
        marginTop: 20,
        borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28,
    },
    browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // ── Bottom navigation bar ──
    bottomNav: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row',
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        borderTopWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 12,
    },
    navItem:       { flex: 1, alignItems: 'center', gap: 3 },
    navLabel:      { fontSize: 11, fontWeight: '500' },
    navLabelActive:{ fontWeight: '700' },
    navBadge: {
        position: 'absolute', top: -4, right: -6,
        borderRadius: 8,
        minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 3, borderWidth: 1.5,
    },
    navBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
