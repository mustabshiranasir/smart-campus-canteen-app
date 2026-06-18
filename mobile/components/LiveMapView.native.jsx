import MapView, { Marker } from 'react-native-maps';

/**
 * Native map (iOS/Android). Web uses LiveMapView.web.jsx instead.
 */
export default function LiveMapView({
  style,
  region,
  showsUserLocation,
  showsMyLocationButton,
  markers = [],
}) {
  return (
    <MapView
      style={style}
      region={region}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          title={m.title}
          description={m.description}
          pinColor={m.pinColor}
        />
      ))}
    </MapView>
  );
}
