import React from 'react';
import { View } from 'react-native';

/**
 * Web Map View - Embeds a Google Maps iframe for web platform.
 */
export default function LiveMapView({ style, region, markers = [], theme }) {
  // Determine latitude & longitude from region, first marker, or default values
  const lat = region?.latitude ?? (markers[0]?.latitude ?? 33.6844);
  const lng = region?.longitude ?? (markers[0]?.longitude ?? 73.0479);

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <iframe
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Google Maps Embed"
        allowFullScreen
        loading="lazy"
      />
    </View>
  );
}
