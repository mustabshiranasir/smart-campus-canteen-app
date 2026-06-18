// mobile/app/(admin)/dashboard.jsx
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Dimensions, Platform, RefreshControl, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api, { SERVER_BASE_URL } from '../../services/api';
import NotificationDrawer from '../../components/NotificationDrawer';
import { useTheme } from '../../context/ThemeContext';

/* ─────────── Stat Card ─────────── */
function StatCard({ icon, label, value, trend, iconBg, iconColor, isPhone, isSelected, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.statCard,
        isPhone && { padding: 10 },
        isSelected && { borderColor: iconColor, borderWidth: 1.5 }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statCardTop}>
        <View style={[styles.statIconBox, { backgroundColor: iconBg }, isPhone && { width: 36, height: 36, borderRadius: 10 }]}>
          <Ionicons name={icon} size={isPhone ? 18 : 24} color={iconColor} />
        </View>
        {trend != null && !isPhone && (
          <View style={styles.trendBadge}>
            <Text style={styles.trendBadgeText}>+{trend}%</Text>
          </View>
        )}
      </View>
      <Text style={[styles.statLabel, isPhone && { fontSize: 11, marginBottom: 2 }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statValue, isPhone && { fontSize: 16 }]} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}

/* ─────────── Main ─────────── */
export default function AdminDashboard() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { theme } = useTheme();

  // Interactive Stat breakdowns
  const [selectedStatTab, setSelectedStatTab] = useState(null);
  const [rawOrders, setRawOrders] = useState([]);
  const [rawFoods, setRawFoods] = useState([]);

  const [stats, setStats] = useState({ todayOrders: 0, revenue: 0, menuItems: 0, activeUsers: 0 });
  const [recent, setRecent] = useState([]);
  const [low, setLow] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleStatCardClick = (tab) => {
    if (selectedStatTab === tab) {
      setSelectedStatTab(null);
    } else {
      setSelectedStatTab(tab);
    }
  };

  const fetchData = async () => {
    try {
      const [ordersRes, foodsRes] = await Promise.all([
        api.get('/orders'),
        api.get('/food')
      ]);

      if (ordersRes.data.success && foodsRes.data.success) {
        const dbOrders = ordersRes.data.data;
        const dbFoods = foodsRes.data.data;

        setRawOrders(dbOrders);
        setRawFoods(dbFoods);

        // Calculate today's orders
        const today = new Date().toDateString();
        const todayOrdersList = dbOrders.filter(o => new Date(o.createdAt).toDateString() === today);
        const todayOrdersCount = todayOrdersList.length;

        // Calculate revenue (sum totalAmount of all delivered/completed orders)
        const todayRevenue = todayOrdersList
          .filter(o => o.status === 'delivered' || o.status === 'completed' || o.status === 'ready' || o.status === 'preparing')
          .reduce((acc, o) => acc + o.totalAmount, 0);

        // Number of menu items
        const menuCount = dbFoods.length;

        // Unique active users (who placed orders today/overall)
        const uniqueUsers = new Set(dbOrders.map(o => o.userId?._id || o.userId)).size;

        setStats({
          todayOrders: todayOrdersCount,
          revenue: todayRevenue,
          menuItems: menuCount,
          activeUsers: uniqueUsers || 0
        });

        // Setup recent orders list (priority queue order for active, then newest)
        const queueSorted = [...dbOrders].sort((a, b) => {
          const active = ['pending', 'preparing', 'ready'];
          const aActive = active.includes(a.status);
          const bActive = active.includes(b.status);
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          if (aActive && bActive) {
            const p = (a.priority ?? 2) - (b.priority ?? 2);
            if (p !== 0) return p;
            return new Date(a.createdAt) - new Date(b.createdAt);
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        const recentFormatted = queueSorted.slice(0, 3).map(order => ({
          _id: order._id,
          customer: order.userId?.name || 'Student',
          amount: order.totalAmount,
          status: order.status,
          priority: order.priority ?? (order.userId?.role === 'faculty' ? 1 : 2),
        }));
        setRecent(recentFormatted);

        // Setup low stock/disabled alerts (where status is unavailable or stock is <= 5)
        const lowStockFormatted = dbFoods.filter(f => f.status === 'unavailable' || (f.stock !== undefined && f.stock <= 5)).map(f => ({
          name: f.name,
          stock: f.stock !== undefined ? f.stock : 0,
          category: f.category,
          image: f.imageUrl,
          status: f.status
        }));
        setLow(lowStockFormatted);
      }
    } catch (err) {
      console.log('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const { width: screenWidth } = Dimensions.get('window');
  const isPhone = screenWidth < 768;

  const navItems = [
    { icon: 'grid', iconO: 'grid-outline', label: 'Dashboard', active: true, route: '/(admin)/dashboard', badge: null },
    { icon: 'bag-handle', iconO: 'bag-handle-outline', label: 'Orders', active: false, route: '/(admin)/orders', badge: null },
    { icon: 'cube', iconO: 'cube-outline', label: 'Menu Items', active: false, route: '/(admin)/menu', badge: null },
    { icon: 'settings', iconO: 'settings-outline', label: 'Settings', active: false, route: '/(admin)/settings', badge: null },
  ];

  const STATUS_COLORS = {
    pending: { color: '#D97706', bg: '#FEF3C7' },
    preparing: { color: '#E8820C', bg: '#FFF0DE' },
    ready: { color: '#16A34A', bg: '#DCFCE7' },
    delivered: { color: '#6B7280', bg: '#F3F4F6' },
    cancelled: { color: '#EF4444', bg: '#FEE2E2' },
  };

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
              Welcome back, Admin 👋
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Notification Drawer */}
          <NotificationDrawer theme={theme} />

          {/* Profile Avatar Clickable to Settings */}
          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/(admin)/settings')}
            activeOpacity={0.7}
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

      <View style={[styles.layout]}>
        {/* ── Main Content ── */}
        <ScrollView
          style={[styles.content, { padding: 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8820C" />}
        >

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                icon="bag-handle-outline"
                label="Today's Orders"
                value={stats.todayOrders}
                trend={null}
                iconBg="#FFF0DE"
                iconColor="#E8820C"
                isPhone={isPhone}
                isSelected={selectedStatTab === 'orders'}
                onPress={() => handleStatCardClick('orders')}
              />
              <StatCard
                icon="trending-up-outline"
                label="Revenue"
                value={`Rs. ${stats.revenue.toLocaleString()}`}
                trend={null}
                iconBg="#DCFCE7"
                iconColor="#16A34A"
                isPhone={isPhone}
                isSelected={selectedStatTab === 'revenue'}
                onPress={() => handleStatCardClick('revenue')}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                icon="cube-outline"
                label="Menu Items"
                value={stats.menuItems}
                trend={null}
                iconBg="#EFF6FF"
                iconColor="#3B82F6"
                isPhone={isPhone}
                isSelected={selectedStatTab === 'menu'}
                onPress={() => handleStatCardClick('menu')}
              />
              <StatCard
                icon="people-outline"
                label="Active Users"
                value={stats.activeUsers}
                trend={null}
                iconBg="#F3E8FF"
                iconColor="#9333EA"
                isPhone={isPhone}
                isSelected={selectedStatTab === 'users'}
                onPress={() => handleStatCardClick('users')}
              />
            </View>
          </View>

          {/* Premium Breakdown Panel */}
          {selectedStatTab && (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, padding: 16, marginBottom: 16 }]}>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 6, height: 18, borderRadius: 3,
                    backgroundColor: selectedStatTab === 'orders' ? '#E8820C' : selectedStatTab === 'revenue' ? '#16A34A' : selectedStatTab === 'menu' ? '#3B82F6' : '#9333EA'
                  }} />
                  <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 14 }]}>
                    {selectedStatTab === 'orders' && "Today's Orders Detail"}
                    {selectedStatTab === 'revenue' && "Today's Earnings Breakdown"}
                    {selectedStatTab === 'menu' && "Menu Distribution & Stock"}
                    {selectedStatTab === 'users' && "Active Canteen Customers"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedStatTab(null)}>
                  <Ionicons name="close-circle" size={22} color={theme.textSub} />
                </TouchableOpacity>
              </View>

              {/* Today's Orders Breakdown List */}
              {selectedStatTab === 'orders' && (() => {
                const today = new Date().toDateString();
                const todayOrders = rawOrders.filter(o => new Date(o.createdAt).toDateString() === today);

                if (todayOrders.length === 0) {
                  return <Text style={{ color: theme.textSub, fontSize: 13, textAlign: 'center', paddingVertical: 14 }}>No orders placed today yet.</Text>;
                }

                return todayOrders.map((o) => {
                  const s = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
                  return (
                    <TouchableOpacity
                      key={o._id}
                      style={styles.breakdownCard}
                      onPress={() => router.replace({ pathname: '/(admin)/orders', params: { filter: o.status } })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.breakdownLeft}>
                        <View style={[styles.customerAvatarMini, { backgroundColor: '#FFF0DE' }]}>
                          <Text style={{ color: '#E8820C', fontWeight: '800', fontSize: 12 }}>
                            {o.userId?.name ? o.userId.name.charAt(0).toUpperCase() : 'S'}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.breakdownTitle, { color: theme.text }]}>Order #{o._id.slice(-6).toUpperCase()}</Text>
                          <Text style={{ fontSize: 11, color: theme.textSub }}>{o.userId?.name || 'Student'} • {o.items?.length || 0} items</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[styles.breakdownAmount, { color: theme.text }]}>Rs. {o.totalAmount}</Text>
                        <View style={[styles.statusPillMini, { backgroundColor: s.bg }]}>
                          <Text style={{ color: s.color, fontSize: 9, fontWeight: '700' }}>{o.status.toUpperCase()}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}

              {/* Revenue Earning breakdown Ledger */}
              {selectedStatTab === 'revenue' && (() => {
                const today = new Date().toDateString();
                const successfulOrders = rawOrders.filter(o =>
                  new Date(o.createdAt).toDateString() === today &&
                  (o.status === 'delivered' || o.status === 'completed' || o.status === 'ready' || o.status === 'preparing')
                );

                if (successfulOrders.length === 0) {
                  return <Text style={{ color: theme.textSub, fontSize: 13, textAlign: 'center', paddingVertical: 14 }}>No revenue transactions today yet.</Text>;
                }

                return (
                  <View>
                    <View style={{ backgroundColor: theme.inputBg, borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.textSub, fontSize: 12 }}>Today's Gross Total:</Text>
                      <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 14 }}>Rs. {stats.revenue.toLocaleString()}</Text>
                    </View>
                    {successfulOrders.map((o) => (
                      <TouchableOpacity
                        key={o._id}
                        style={styles.breakdownCard}
                        onPress={() => router.replace({ pathname: '/(admin)/orders', params: { filter: o.status } })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.breakdownLeft}>
                          <Ionicons name="cash-outline" size={18} color="#16A34A" style={{ marginRight: 6 }} />
                          <View>
                            <Text style={[styles.breakdownTitle, { color: theme.text }]}>Earning via #{o._id.slice(-6).toUpperCase()}</Text>
                            <Text style={{ fontSize: 11, color: theme.textSub }}>{o.userId?.name || 'Student'} • {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                        </View>
                        <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 13 }}>+ Rs. {o.totalAmount}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}

              {/* Menu Categories Inventory list */}
              {selectedStatTab === 'menu' && (() => {
                const cats = rawFoods.reduce((acc, f) => {
                  acc[f.category] = (acc[f.category] || 0) + 1;
                  return acc;
                }, {});

                const unavailableFoods = rawFoods.filter(f => f.status === 'unavailable');

                return (
                  <View>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12, marginBottom: 8 }}>Item Distribution by Category:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {Object.keys(cats).map(cat => (
                        <View key={cat} style={{ backgroundColor: theme.inputBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>{cat}</Text>
                          <View style={{ backgroundColor: '#3B82F6', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{cats[cat]}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {unavailableFoods.length > 0 && (
                      <View>
                        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12, marginTop: 4, marginBottom: 8 }}>Unavailable Items ({unavailableFoods.length}):</Text>
                        {unavailableFoods.map(f => (
                          <TouchableOpacity
                            key={f._id}
                            style={styles.breakdownCard}
                            onPress={() => router.replace('/(admin)/menu')}
                            activeOpacity={0.7}
                          >
                            <View style={styles.breakdownLeft}>
                              <Ionicons name="warning-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                              <Text style={[styles.breakdownTitle, { color: theme.text }]}>{f.name}</Text>
                            </View>
                            <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>Tap to Manage</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Canteen Customers breakdown */}
              {selectedStatTab === 'users' && (() => {
                const uniqueUsers = [];
                const seenIds = new Set();
                rawOrders.forEach(o => {
                  if (o.userId && o.userId._id && !seenIds.has(o.userId._id)) {
                    seenIds.add(o.userId._id);
                    uniqueUsers.push(o.userId);
                  }
                });

                if (uniqueUsers.length === 0) {
                  return <Text style={{ color: theme.textSub, fontSize: 13, textAlign: 'center', paddingVertical: 14 }}>No customer activity logged yet.</Text>;
                }

                return (
                  <View>
                    <View style={{ backgroundColor: theme.inputBg, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                      <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600' }}>Registered Active Canteen Customers today: {uniqueUsers.length}</Text>
                    </View>
                    {uniqueUsers.slice(0, 5).map((u, i) => (
                      <View key={u._id || i} style={styles.breakdownCard}>
                        <View style={styles.breakdownLeft}>
                          <View style={[styles.customerAvatarMini, { backgroundColor: '#F3E8FF', overflow: 'hidden' }]}>
                            {u.profilePicture ? (
                              <Image
                                source={{ uri: `${SERVER_BASE_URL}${u.profilePicture}` }}
                                style={{ width: 32, height: 32, borderRadius: 16 }}
                              />
                            ) : (
                              <Text style={{ color: '#9333EA', fontWeight: '800', fontSize: 12 }}>
                                {u.name ? u.name.charAt(0).toUpperCase() : 'S'}
                              </Text>
                            )}
                          </View>
                          <View>
                            <Text style={[styles.breakdownTitle, { color: theme.text }]}>{u.name || 'Student'}</Text>
                            <Text style={{ fontSize: 11, color: theme.textSub }}>Active Student Customer</Text>
                          </View>
                        </View>
                        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                      </View>
                    ))}
                  </View>
                );
              })()}

            </View>
          )}

          {/* Recent Orders */}
          <View style={[styles.sectionCard, isPhone && { padding: 14 }]}>
            <Text style={[styles.sectionTitle, isPhone && { fontSize: 14 }]}>Recent Orders</Text>
            {recent.length === 0 ? (
              <Text style={{ fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 10 }}>No recent orders</Text>
            ) : (
              recent.map((order, i) => {
                const s = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
                const isFaculty = order.priority === 1;
                return (
                  <TouchableOpacity
                    key={order._id}
                    style={[
                      styles.orderRow,
                      i < recent.length - 1 && styles.rowBorder,
                      isFaculty && {
                        backgroundColor: '#FFFBEB',
                        borderLeftWidth: 4,
                        borderLeftColor: '#F59E0B',
                        paddingLeft: 10,
                        borderRadius: 8,
                      },
                    ]}
                    onPress={() => router.replace({ pathname: '/(admin)/orders', params: { filter: order.status } })}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[styles.orderId, isPhone && { fontSize: 13 }, isFaculty && { color: '#92400E' }]}>
                        Order #{order._id.slice(-6).toUpperCase()}
                        {isFaculty ? ' · Faculty' : ''}
                      </Text>
                      <Text style={styles.orderCustomer}>{order.customer}</Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={[styles.orderAmount, isPhone && { fontSize: 13 }]}>Rs. {order.amount}</Text>
                      <View style={[styles.statusPill, { backgroundColor: s.bg }, isPhone && { paddingHorizontal: 8, paddingVertical: 2 }]}>
                        <Text style={[styles.statusPillText, { color: s.color }, isPhone && { fontSize: 9 }]}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Low Stock/Unavailable Alerts */}
          {low.length > 0 && (
            <View style={[styles.sectionCard, { marginTop: 16 }, isPhone && { padding: 14 }]}>
              <Text style={[styles.sectionTitle, isPhone && { fontSize: 14 }]}>Low Stock & Unavailable Items</Text>
              {low.map((item, i) => (
                <View key={i} style={[styles.orderRow, i < low.length - 1 && styles.rowBorder]}>
                  <View style={styles.stockLeft}>
                    <View style={[styles.stockThumb, isPhone && { width: 36, height: 36 }]}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={[styles.stockImg, isPhone && { width: 36, height: 36 }]} />
                      ) : (
                        <View style={[styles.stockPlaceholder, isPhone && { width: 36, height: 36 }]}>
                          <Text style={[styles.stockPlaceholderText, isPhone && { fontSize: 16 }]}>
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={[styles.orderId, isPhone && { fontSize: 13 }]}>{item.name}</Text>
                      <Text style={styles.orderCustomer}>{item.category}</Text>
                    </View>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={[styles.orderAmount, { color: item.status === 'unavailable' || item.stock === 0 ? '#ef4444' : '#D97706' }, isPhone && { fontSize: 13 }]}>
                      {item.status === 'unavailable' || item.stock === 0 ? 'Out of stock' : `${item.stock} left`}
                    </Text>
                    <Text style={[styles.lowStockLabel, { color: item.status === 'unavailable' || item.stock === 0 ? '#ef4444' : '#D97706' }, isPhone && { fontSize: 10 }]}>
                      {item.status === 'unavailable' ? 'Unavailable' : 'Low Stock'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* ── Bottom Navigation ── */}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[
          { icon: 'grid', iconO: 'grid-outline', label: 'Dashboard', active: true, route: '/(admin)/dashboard' },
          { icon: 'bag-handle', iconO: 'bag-handle-outline', label: 'Orders', active: false, route: '/(admin)/orders' },
          { icon: 'cube', iconO: 'cube-outline', label: 'Menu', active: false, route: '/(admin)/menu' },
          { icon: 'settings', iconO: 'settings-outline', label: 'Settings', active: false, route: '/(admin)/settings' },
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
              color={n.active ? theme.accent : theme.textMuted}
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
  container: { flex: 1 },
  layout: { flex: 1 },

  /* ── Sidebar ── */
  sidebar: {
    width: 220,
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#EBEBEB',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8820C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  logoSub: { fontSize: 12, color: '#999', marginTop: 1 },

  loggedInBox: {
    backgroundColor: '#FFF7EE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminProfilePictureBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  adminProfilePictureImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  loggedInAs: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  loggedInName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },

  navList: { flex: 1, gap: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: '#E8820C' },
  navLabel: { fontSize: 14, fontWeight: '600', color: '#555', flex: 1 },
  navLabelActive: { color: '#fff' },
  navBadge: {
    backgroundColor: '#E8820C',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  navBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },

  /* ── Content ── */
  content: { flex: 1, padding: 24 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    zIndex: 1000,
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a' },
  pageSub: { fontSize: 13, color: '#999', marginTop: 3 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bellWrap: { position: 'relative' },
  bellDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444',
  },
  dateBox: { alignItems: 'flex-end' },
  dateText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  timeText: { fontSize: 12, color: '#999', marginTop: 1 },

  /* ── Stats ── */
  statsGrid: { gap: 14, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 14 },

  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendBadgeText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  statLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },

  /* ── Section Card ── */
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 14 },

  /* ── Order Row ── */
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  orderId: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  orderCustomer: { fontSize: 12, color: '#aaa', marginTop: 3 },
  orderRight: { alignItems: 'flex-end', gap: 5 },
  orderAmount: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  /* ── Low Stock ── */
  stockLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  stockImg: { width: 48, height: 48 },
  stockPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#FFE8D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockPlaceholderText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#E8820C',
  },
  lowStockLabel: { fontSize: 11, fontWeight: '600' },

  /* ── Bottom Nav ── */
  bottomNav: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
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
    color: '#666',
  },
  bottomNavLabelActive: {
    color: '#E8820C',
    fontWeight: '700',
  },

  /* ── Header / Navbar Styles ── */
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    overflow: 'hidden',
  },

  /* ── Stats Breakdown panel Styles ── */
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  customerAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillMini: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
