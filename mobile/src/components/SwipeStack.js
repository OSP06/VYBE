import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Animated, PanResponder, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, radius } from '../constants/theme';
import FadeImage from './FadeImage';

const PLACE_GRADS = [
  ['#c8ddd0', '#6b8f5e'], ['#e0d0ec', '#b09ac0'], ['#f0d8c0', '#e8c4a0'],
  ['#f0e0c0', '#e8d4a8'], ['#c8d8e8', '#7a9ab0'], ['#f0d0d8', '#c07a8a'],
  ['#c8e0d8', '#6aaa98'], ['#d8dcc0', '#a0a868'],
];
const gradFor = (id) => PLACE_GRADS[(id - 1) % 8];

const PRICE = ['', '$', '$$', '$$$', '$$$$'];
const VIBE_LABELS = {
  calm: 'CALM', aesthetic: 'AESTHETIC', lively: 'LIVELY', social: 'SOCIAL',
  premium: 'PREMIUM', budget: 'BUDGET', work_friendly: 'WORK', date_friendly: 'DATE',
};

function topVibes(vv, n = 3) {
  if (!vv) return [];
  return Object.entries(vv).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k]) => VIBE_LABELS[k] || k.toUpperCase());
}

export default function SwipeStack({ places, onSeeAll, onPress, savedIds, onSave, colors }) {
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Refs so panResponder always has fresh values without recreation
  const onSaveRef = useRef(onSave);
  const onPressRef = useRef(onPress);
  const topPlaceRef = useRef(null);
  const dismissRef = useRef(null);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);

  useEffect(() => {
    setIndex(0);
    setImgError(false);
    pan.setValue({ x: 0, y: 0 });
    opacity.setValue(1);
  }, [places]);

  useEffect(() => { setImgError(false); }, [index]);

  const dismiss = (toX, toY) => {
    Animated.parallel([
      Animated.timing(pan, { toValue: { x: toX, y: toY }, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      pan.setValue({ x: 0, y: 0 });
      opacity.setValue(1);
      setIndex(i => i + 1);
    });
  };
  dismissRef.current = dismiss;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > 80) {
        // Right swipe — save + dismiss
        if (topPlaceRef.current) {
          onSaveRef.current(topPlaceRef.current.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        dismissRef.current(600, g.dy * 0.3);
      } else if (g.dx < -80) {
        dismissRef.current(-600, g.dy * 0.3);
      } else if (g.dy > 100) {
        dismissRef.current(g.dx * 0.3, 600);
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, tension: 120, friction: 8 }).start();
      }
    },
  })).current;

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const stackPlaces = places.slice(index, index + 10);
  topPlaceRef.current = stackPlaces[0] || null;

  // Swipe direction indicators
  const saveOpacity = pan.x.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = pan.x.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-8deg', '0deg', '8deg'] });

  if (index >= places.length || stackPlaces.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>YOU'VE SEEN IT ALL</Text>
        <Text style={styles.emptySub}>Want more? Browse by vibe.</Text>
        <Pressable style={styles.seeAllBtn} onPress={onSeeAll}>
          <Text style={styles.seeAllTxt}>EXPLORE MORE →</Text>
        </Pressable>
      </View>
    );
  }

  const place = stackPlaces[0];

  return (
    <View style={styles.stackWrap}>
      {/* Shadow cards */}
      {[2, 1].map((offset) => {
        const p = stackPlaces[offset];
        if (!p) return null;
        return (
          <View
            key={p.id}
            style={[styles.card, styles.shadowCard, {
              transform: [{ scale: 1 - offset * 0.035 }, { translateY: offset * 12 }],
              zIndex: -offset,
            }]}
          />
        );
      })}

      {/* Top card */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }], opacity, zIndex: 10 }]}
        {...panResponder.panHandlers}
      >
        {/* Photo */}
        <View style={styles.cardImg}>
          <LinearGradient colors={gradFor(place.id)} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          {place.image_url && !imgError && (
            <FadeImage
              source={{ uri: place.image_url }}
              style={StyleSheet.absoluteFill}
              onError={() => setImgError(true)}
            />
          )}
          <View style={styles.cardImgOverlay} />

          {/* Swipe direction labels */}
          <Animated.View style={[styles.swipeLabelLeft, { opacity: skipOpacity }]}>
            <Text style={styles.swipeLabelTxtSkip}>SKIP</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeLabelRight, { opacity: saveOpacity }]}>
            <Text style={styles.swipeLabelTxtSave}>SAVE ❤️</Text>
          </Animated.View>

          {/* Heart button */}
          <Pressable style={styles.cardHeart} onPress={() => { onSave(place.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
            <Text style={{ fontSize: 22 }}>{savedIds.has(place.id) ? '❤️' : '🤍'}</Text>
          </Pressable>

          {/* Rating */}
          <View style={styles.ratingPill}>
            <Text style={[styles.ratingTxt, { color: colors.gold }]}>★ {place.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Info — fills remaining card height */}
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: colors.txt }]} numberOfLines={2}>{place.name}</Text>
          {place.neighborhood && (
            <Text style={[styles.cardNeighborhood, { color: colors.txt3 }]}>📍 {place.neighborhood}</Text>
          )}
          {place.vibe?.summary ? (
            <Text style={[styles.cardSummary, { color: colors.txt2 }]} numberOfLines={2}>{place.vibe.summary}</Text>
          ) : null}
          {place.vibe?.vibe_vector && (
            <View style={styles.cardChips}>
              {topVibes(place.vibe.vibe_vector).map((v) => (
                <View key={v} style={[styles.cardChip, { borderColor: colors.border, backgroundColor: colors.glass }]}>
                  <Text style={[styles.cardChipTxt, { color: colors.txt2 }]}>{v}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.cardFootRow}>
            <Pressable style={styles.seeMoreBtn} onPress={() => onPress(place)}>
              <Text style={styles.seeMoreTxt}>SEE MORE</Text>
              <View style={styles.seeMoreArrow}>
                <Text style={{ color: colors.bg, fontSize: 13 }}>→</Text>
              </View>
            </Pressable>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cardPrice, { color: colors.txt2 }]}>{PRICE[place.price_range]}</Text>
              {place.score >= 0.55 && (
                <Text style={[styles.cardMatch, { color: colors.sage }]}>{Math.round(place.score * 100)}% VIBE MATCH</Text>
              )}
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Swipe hint */}
      <Text style={[styles.hint, { color: colors.txt3 }]}>← SKIP · SWIPE RIGHT TO SAVE →</Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    stackWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 14, paddingTop: 6 },

    card: {
      position: 'absolute',
      width: '100%', height: '94%',
      borderRadius: radius.card,
      backgroundColor: colors?.bg || '#F2EDE6',
      shadowColor: '#A67C52', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
      overflow: 'hidden',
      flexDirection: 'column',
    },
    shadowCard: { backgroundColor: colors?.border2 || '#E0D8CC' },

    cardImg: { height: '60%' },
    cardImgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.14)' },

    swipeLabelLeft: {
      position: 'absolute', top: 22, left: 18,
      borderWidth: 2.5, borderColor: '#C25B4E', borderRadius: radius.card,
      paddingHorizontal: 12, paddingVertical: 5,
    },
    swipeLabelTxtSkip: { fontFamily: fonts.display, fontSize: 18, color: '#C25B4E', letterSpacing: 2 },
    swipeLabelRight: {
      position: 'absolute', top: 22, right: 18,
      borderWidth: 2.5, borderColor: colors?.sage || '#6B8F5E', borderRadius: radius.card,
      paddingHorizontal: 12, paddingVertical: 5,
    },
    swipeLabelTxtSave: { fontFamily: fonts.display, fontSize: 18, color: colors?.sage || '#6B8F5E', letterSpacing: 2 },

    cardHeart: { position: 'absolute', top: 14, right: 14 },
    ratingPill: {
      position: 'absolute', bottom: 12, left: 14,
      backgroundColor: 'rgba(0,0,0,0.62)',
      paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.card,
    },
    ratingTxt: { fontSize: 12, fontWeight: '700' },

    cardBody: { flex: 1, padding: 18, gap: 8, justifyContent: 'space-between' },
    cardName: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.5, lineHeight: 26 },
    cardNeighborhood: { fontSize: 12, marginTop: -4 },
    cardSummary: { fontSize: 12, lineHeight: 18 },
    cardChips: { flexDirection: 'row', gap: 6 },
    cardChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 3, borderWidth: 1 },
    cardChipTxt: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },

    cardFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    seeMoreBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors?.txt || '#1A1814',
      borderRadius: radius.card, paddingHorizontal: 20, paddingVertical: 13,
    },
    seeMoreTxt: { fontFamily: fonts.display, fontSize: 15, color: colors?.bg || '#F2EDE6', letterSpacing: 1.5 },
    seeMoreArrow: {
      width: 24, height: 24, borderRadius: radius.card,
      backgroundColor: colors?.txt2 || '#7A7060',
      alignItems: 'center', justifyContent: 'center',
    },
    cardPrice: { fontSize: 13, fontWeight: '600' },
    cardMatch: { fontSize: 12, fontWeight: '700', marginTop: 2 },

    hint: { position: 'absolute', bottom: 4, fontSize: 10, letterSpacing: 2, opacity: 0.45 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyTitle: { fontFamily: fonts.display, fontSize: 26, color: colors?.txt || '#1A1814', letterSpacing: 1 },
    emptySub: { fontSize: 13, color: colors?.txt3 || '#AEA090' },
    seeAllBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: colors?.sage || '#6B8F5E', borderRadius: radius.card },
    seeAllTxt: { fontFamily: fonts.display, fontSize: 15, color: '#fff', letterSpacing: 2 },
  });
}
