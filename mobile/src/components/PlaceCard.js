import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, fonts, radius, shadows } from '../constants/theme';
import VibeBar from './VibeBar';

const PRICE_SYMBOLS = ['', '$', '$$', '$$$', '$$$$'];

export default function PlaceCard({ place, onPress, onSave, saved }) {
  const scale = useRef(new Animated.Value(1)).current;

  const GlassLayer = Platform.OS === 'ios'
    ? ({ children, style }) => <BlurView intensity={30} tint="light" style={style}>{children}</BlurView>
    : ({ children, style }) => <View style={[style, { backgroundColor: colors.glass }]}>{children}</View>;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, styles.wrapper]}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        onPress={() => onPress(place)}
        style={[styles.card, shadows.card]}
      >
        <View style={styles.hero}>
          {place.image_url ? (
            <>
              <Image source={{ uri: place.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.heroOverlay} />
            </>
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroFallbackText}>{place.name[0]}</Text>
            </View>
          )}
        </View>

        <GlassLayer style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
            <Pressable onPress={() => onSave(place.id)} style={styles.heartBtn}>
              <Text style={styles.heart}>{saved ? '❤️' : '🤍'}</Text>
            </Pressable>
          </View>

          <Text style={styles.address} numberOfLines={1}>{place.address}</Text>

          <View style={styles.meta}>
            <Text style={styles.metaText}>{'★'.repeat(Math.round(place.rating))} {place.rating.toFixed(1)}</Text>
            <Text style={styles.metaText}>{PRICE_SYMBOLS[place.price_range]}</Text>
            {place.vibe?.crowd && <Text style={styles.crowd}>{place.vibe.crowd}</Text>}
          </View>

          {place.vibe?.vibe_vector && (
            <View style={styles.vibeSection}>
              <VibeBar vibeVector={place.vibe.vibe_vector} compact />
            </View>
          )}

          {place.score > 0 && (
            <Text style={styles.score}>Vibe match {Math.round(place.score * 100)}%</Text>
          )}
        </GlassLayer>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginVertical: 8 },
  card: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.bg },
  hero: { height: 200, overflow: 'hidden' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,24,20,0.25)',
  },
  heroFallback: {
    flex: 1,
    backgroundColor: colors.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackText: {
    fontFamily: fonts.display,
    fontSize: 64,
    color: colors.txt3,
    letterSpacing: 2,
  },
  content: { padding: 16, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.txt, letterSpacing: 0.5, flex: 1 },
  heartBtn: { padding: 4 },
  heart: { fontSize: 18 },
  address: { fontFamily: fonts.body, fontSize: 12, color: colors.txt2 },
  meta: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.txt2 },
  crowd: {
    fontFamily: fonts.body, fontSize: 11, color: colors.gold,
    backgroundColor: colors.bg2, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.small,
  },
  vibeSection: { marginTop: 4 },
  score: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.sage, marginTop: 2 },
});
