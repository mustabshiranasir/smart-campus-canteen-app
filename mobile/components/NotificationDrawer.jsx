import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

export default function NotificationDrawer({ theme }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeToasts, setActiveToasts] = useState([]);

  // Track previous notifications to detect newly arrived ones
  const prevNotificationsRef = useRef([]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.log('Mark notifications read failed:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        const fetched = res.data.data;
        const prev = prevNotificationsRef.current;

        // Detect new notifications
        if (prev.length > 0 && fetched.length > 0) {
          const newNotifications = fetched.filter(f => !prev.some(p => p._id === f._id));

          if (newNotifications.length > 0) {
            // Add new notifications to the active toasts stack
            setActiveToasts(current => {
              const merged = [...newNotifications, ...current];
              return merged.slice(0, 3); // Limit to 3 stack items to prevent blocking the UI
            });
          }
        } else if (prev.length === 0 && fetched.length > 0) {
          // On first load, show the latest unread notification as a toast
          const latest = fetched[0];
          setActiveToasts([latest]);
        }

        prevNotificationsRef.current = fetched;
        setNotifications(fetched);
      }
    } catch (err) {
      console.log('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setActiveToasts(current => current.filter(item => item._id !== id));
    } catch (err) {
      console.log('Error deleting notification:', err);
    }
  };

  const toggleDrawer = () => {
    if (!open) markAllRead();
    setOpen((v) => !v);
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      setActiveToasts([]);
    } catch (err) {
      console.log('Error clearing all notifications:', err);
    }
  };

  const unreadCount = notifications.length;
  const accentColor = theme.accent || '#E8820C';
  const isPhone = screenWidth < 768;

  const toastStackStyle = [
    styles.toastStackContainer,
    isPhone ? {
      top: Platform.OS === 'ios' ? 80 : 70,
      right: 16,
      width: screenWidth - 32,
    } : {
      top: Platform.OS === 'ios' ? 85 : 75,
      right: 20,
      width: 300,
    }
  ];

  const dropdownStyle = [
    styles.dropdown,
    isPhone ? {
      top: 50,
      right: -60, // Align properly on mobile screens
      width: 280,
    } : {
      top: 50,
      right: 0,
      width: 320,
    }
  ];

  return (
    <View style={styles.container}>
      {/* Bell Button */}
      <TouchableOpacity
        style={[styles.bellBtn, { backgroundColor: theme.inputBg || '#F3F4F6' }]}
        onPress={toggleDrawer}
        activeOpacity={0.7}
      >
        <Ionicons name={unreadCount > 0 ? "notifications" : "notifications-outline"} size={22} color={theme.text} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Notifications Dropdown */}
      {open && (
        <View style={[dropdownStyle, { backgroundColor: theme.card || '#FFF', borderColor: theme.border || '#E5E7EB' }]}>
          <View style={[styles.header, { borderBottomColor: theme.border || '#E5E7EB' }]}>
            <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={{ fontSize: 12, color: accentColor, fontWeight: '700' }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={32} color={theme.textMuted || '#9CA3AF'} />
              <Text style={[styles.emptyText, { color: theme.textMuted || '#9CA3AF' }]}>No notifications yet</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.map((item) => (
                <View key={item._id} style={[styles.card, { backgroundColor: theme.inputBg || '#F9FAFB', borderColor: theme.border || '#E5E7EB' }]}>
                  <Text style={[styles.msgText, { color: theme.text }]}>{item.message}</Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteNotification(item._id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Floating Popup Stack of Toast Notifications */}
      {activeToasts.length > 0 && (
        <View style={toastStackStyle}>
          {activeToasts.map((toast) => (
            <View key={toast._id} style={[styles.toastCard, { borderLeftColor: accentColor, backgroundColor: theme.card || '#FFF' }]}>
              <View style={styles.toastHeader}>
                <View style={styles.toastTitleRow}>
                  <Ionicons name="notifications" size={16} color={accentColor} />
                  <Text style={[styles.toastTitle, { color: theme.text }]}>New Notification</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveToasts(current => current.filter(item => item._id !== toast._id))}>
                  <Ionicons name="close" size={18} color={theme.textMuted || '#6B7280'} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.toastMsg, { color: theme.textSub }]}>{toast.message}</Text>
              <TouchableOpacity
                style={styles.toastDismissBtn}
                onPress={() => deleteNotification(toast._id)}
              >
                <Text style={[styles.toastDismissText, { color: accentColor }]}>Mark as Read & Dismiss</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 99999,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dropdown: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    maxHeight: 250,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  msgText: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
    lineHeight: 16,
  },
  deleteBtn: {
    padding: 4,
  },

  // Floating Toast Stack styles
  toastStackContainer: {
    position: 'absolute',
    gap: 8,
    zIndex: 999999,
  },
  toastCard: {
    width: '100%',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toastTitle: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  toastMsg: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  toastDismissBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  toastDismissText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
