import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../constants/theme';

const DIMS = [
  { key: 'calm', label: 'Calm' },
  { key: 'aesthetic', label: 'Aesthetic' },
  { key: 'lively', label: 'Lively' },
  { key: 'social', label: 'Social' },
  { key: 'premium', label: 'Premium' },
  { key: 'budget', label: 'Budget' },
  { key: 'work_friendly', label: 'Work' },
  { key: 'date_friendly', label: 'Date' },
];

export default function VibeBar({ vibeVector, compact = false }) {
  if (!vibeVector) return null;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        {DIMS.slice(0, 4).map(({ key, label }) => (
          <View key={key} style={styles.compactItem}>
            <View style={styles.trackSmall}>
              <View style={[styles.fillSmall, { width: `${(vibeVector[key] || 0) * 100}%` }]} />
            </View>
            <Text style={styles.labelSmall}>{label}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {DIMS.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(vibeVector[key] || 0) * 100}%` }]} />
          </View>
          <Text style={styles.value}>{Math.round((vibeVector[key] || 0) * 10)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.body, fontSize: 12, color: colors.txt2, width: 60 },
  track: {
    flex: 1, height: 4, backgroundColor: colors.bg3, borderRadius: 2, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.gold, borderRadius: 2 },
  value: { fontFamily: fonts.body, fontSize: 11, color: colors.txt3, width: 16, textAlign: 'right' },
  compactRow: { flexDirection: 'row', gap: 6 },
  compactItem: { flex: 1, alignItems: 'center', gap: 3 },
  trackSmall: {
    width: '100%', height: 3, backgroundColor: colors.bg3, borderRadius: 2, overflow: 'hidden',
  },
  fillSmall: { height: '100%', backgroundColor: colors.gold, borderRadius: 2 },
  labelSmall: { fontFamily: fonts.body, fontSize: 9, color: colors.txt3 },
});
