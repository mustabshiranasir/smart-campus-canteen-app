import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart, useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import FoodList from '../../components/FoodList';
import NotificationDrawer from '../../components/NotificationDrawer';
import { SERVER_BASE_URL } from '../../services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Foodie Moodie</Text>
            <Text style={[styles.headerSub, { color: theme.textSub }]}>
              Welcome, {user?.name || (user?.role === 'faculty' ? 'Faculty' : 'Student')} 👋
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Notification Bell */}
          <NotificationDrawer theme={theme} />

          {/* Cart with badge */}
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.inputBg }]}
            onPress={() => router.push('/(student)/cart')}
          >
            <Ionicons name="cart-outline" size={24} color={theme.text} />
            {totalItems > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: theme.accent }]}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: theme.accent }]}
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

      {/* Main Food List */}
      <FoodList />

      {/* Floating AI Assistant Button */}
      {!isAdmin && (
        <TouchableOpacity
          style={[styles.assistantFab, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/(student)/assistant')}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[
          { icon: 'home', iconOff: 'home-outline', label: 'Home', route: '/(student)/' },
          { icon: 'cart', iconOff: 'cart-outline', label: 'Cart', route: '/(student)/cart', badge: totalItems },
          { icon: 'time', iconOff: 'time-outline', label: 'Orders', route: '/(student)/orders' },
          { icon: 'person', iconOff: 'person-outline', label: 'Profile', route: '/(student)/profile' },
        ].map(tab => {
          const active = tab.label === 'Home';
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
                  color={active ? theme.accent : theme.textMuted}
                />
                {tab.badge > 0 && (
                  <View style={[styles.navBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.navBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, { color: theme.textMuted }, active && { color: theme.accent, fontWeight: '700' }]}>
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
  root: {
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
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    position: 'relative',
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  navBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  assistantFab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 1000,
  },
});
