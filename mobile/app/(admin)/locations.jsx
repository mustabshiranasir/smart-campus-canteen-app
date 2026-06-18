import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  StatusBar, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LiveMapView from '../../components/LiveMapView';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const DEFAULT_REGION = {
  latitude: 33.6844,
  longitude: 73.0479,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const ROLE_COLOR = { faculty: '#F59E0B', student: '#3B82F6' };

export default function AdminLocationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const intervalRef = useRef(null);

  const focusUserId = params.focusUserId ? String(params.focusUserId) : null;
  const focusName = params.customerName ? String(params.customerName) : null;

  const focusRegion = (data, userId) => {
    const match = userId
      ? data.find((l) => (l.userId?._id || l.userId)?.toString() === userId)
      : null;
    const target = match || (data.length ? data[0] : null);
    if (!target) return;
    setRegion({
      latitude: target.latitude,
      longitude: target.longitude,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    });
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/location/live');
      if (res.data.success) {
        const data = res.data.data || [];
        setLocations(data);
        if (focusUserId) {
          focusRegion(data, focusUserId);
        } else if (data.length > 0) {
          const lats = data.map((l) => l.latitude);
          const lngs = data.map((l) => l.longitude);
          setRegion({
            latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
            longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
            latitudeDelta: Math.max(0.01, (Math.max(...lats) - Math.min(...lats)) * 1.5 + 0.005),
            longitudeDelta: Math.max(0.01, (Math.max(...lngs) - Math.min(...lngs)) * 1.5 + 0.005),
          });
        }
      }
    } catch (err) {
      console.log('Fetch locations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    intervalRef.current = setInterval(fetchLocations, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {focusName ? `Tracking ${focusName}` : 'Live user locations'}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSub }]}>
            {focusUserId ? 'Delivery tracking' : `${locations.length} active`} · refreshes every 5s
          </Text>
        </View>
        <TouchableOpacity onPress={fetchLocations} style={[styles.backBtn, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="refresh" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <LiveMapView
        style={styles.map}
        region={region}
        theme={theme}
        markers={locations.map((loc) => {
          const uid = (loc.userId?._id || loc.userId)?.toString();
          const isFocus = focusUserId && uid === focusUserId;
          return {
            id: loc._id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            title: loc.name || loc.userId?.name || 'User',
            description: `${loc.role || 'user'} · updated ${new Date(loc.lastUpdated).toLocaleTimeString()}`,
            pinColor: isFocus ? '#EF4444' : (ROLE_COLOR[loc.role] || '#6B7280'),
          };
        })}
      />

      <View style={[styles.listPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.listTitle, { color: theme.text }]}>Active trackers</Text>
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} />
        ) : locations.length === 0 ? (
          <Text style={{ color: theme.textSub, fontSize: 13, paddingVertical: 8 }}>
            No users sharing location right now.
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled>
            {locations.map((loc) => (
              <View key={loc._id} style={[styles.userRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.roleDot, { backgroundColor: ROLE_COLOR[loc.role] || '#6B7280' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {loc.name || loc.userId?.name || 'Unknown'}
                  </Text>
                  <Text style={{ color: theme.textSub, fontSize: 11 }}>
                    {loc.role} · {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </Text>
                </View>
                <Text style={{ color: theme.textSub, fontSize: 10 }}>
                  {new Date(loc.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, zIndex: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12 },
  map: { flex: 1 },
  listPanel: { padding: 14, borderTopWidth: 1, maxHeight: 200 },
  listTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  roleDot: { width: 10, height: 10, borderRadius: 5 },
  userName: { fontSize: 14, fontWeight: '600' },
});
