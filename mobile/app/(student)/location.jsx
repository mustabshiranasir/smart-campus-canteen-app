import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LiveMapView from '../../components/LiveMapView';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

const DEFAULT_REGION = {
  latitude: 33.6844,
  longitude: 73.0479,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function StudentLocationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const watchRef = useRef(null);
  const sharingRef = useRef(true);

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [coords, setCoords] = useState(null);
  const [sharing, setSharing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pushLocation = async (location) => {
    if (!sharingRef.current) return;
    try {
      await api.post('/location/me', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        heading: location.coords.heading,
        speed: location.coords.speed,
        isSharing: true,
      });
    } catch (err) {
      console.log('Location sync error:', err);
    }
  };

  const startTracking = async () => {
    setLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required for live tracking.');
        setLoading(false);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords(current.coords);
      setRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
      await pushLocation(current);

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (loc) => {
          setCoords(loc.coords);
          setRegion((r) => ({
            ...r,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }));
          if (sharingRef.current) await pushLocation(loc);
        }
      );
    } catch (e) {
      setError('Could not access GPS. Enable location services and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTracking();
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  useEffect(() => {
    if (coords && sharing) {
      pushLocation({ coords });
    }
  }, [sharing]);

  const toggleSharing = async () => {
    const next = !sharing;
    setSharing(next);
    sharingRef.current = next;
    if (!next) {
      try {
        await api.patch('/location/me/stop');
      } catch (_) {}
    } else if (coords) {
      await api.post('/location/me', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        isSharing: true,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Live location</Text>
          <Text style={[styles.headerSub, { color: theme.textSub }]}>
            Shared with canteen admin in real time
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.textSub, marginTop: 12 }}>Getting your location…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color={theme.textSub} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.accent }]} onPress={startTracking}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <LiveMapView
            style={styles.map}
            region={region}
            theme={theme}
            showsUserLocation
            showsMyLocationButton
            markers={
              coords
                ? [{
                    id: 'me',
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    title: user?.name || 'You',
                    description: 'Your live location',
                    pinColor: theme.accent === '#FF7A00' ? '#FF7A00' : '#3B82F6',
                  }]
                : []
            }
          />

          <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.panelRow}>
              <Ionicons name="navigate" size={18} color={sharing ? '#22C55E' : theme.textSub} />
              <Text style={[styles.panelText, { color: theme.text }]}>
                {sharing ? 'Sharing live location with admin' : 'Location sharing paused'}
              </Text>
            </View>
            {coords && (
              <Text style={{ color: theme.textSub, fontSize: 12, marginTop: 6 }}>
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                {coords.accuracy ? ` · ±${Math.round(coords.accuracy)}m` : ''}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: sharing ? '#FEE2E2' : theme.accent }]}
              onPress={toggleSharing}
            >
              <Text style={{ color: sharing ? '#EF4444' : '#fff', fontWeight: '700' }}>
                {sharing ? 'Stop sharing' : 'Resume sharing'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12 },
  map: { flex: 1 },
  panel: { padding: 16, borderTopWidth: 1 },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelText: { fontSize: 14, fontWeight: '600', flex: 1 },
  shareBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { textAlign: 'center', marginTop: 12, fontSize: 14 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700' },
});
