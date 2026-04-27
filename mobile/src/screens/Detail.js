import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, SafeAreaView, StatusBar, Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPlace, savePlace, unsavePlace, fetchSaved } from '../services/api';
import { fonts, radius } from '../constants/theme';
import MoodHero from '../components/MoodHero';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const VIBE_LABELS = {
  calm: 'CALM', aesthetic: 'AESTHETIC', lively: 'LIVELY', social: 'SOCIAL',
  premium: 'PREMIUM', budget: 'BUDGET', work_friendly: 'WORK', date_friendly: 'DATE',
};

const PLACE_GRADS = [
  ['#c8ddd0', '#6b8f5e'], ['#e0d0ec', '#b09ac0'], ['#f0d8c0', '#e8c4a0'],
  ['#f0e0c0', '#e8d4a8'], ['#c8d8e8', '#7a9ab0'], ['#f0d0d8', '#c07a8a'],
  ['#c8e0d8', '#6aaa98'], ['#d8dcc0', '#a0a868'],
];
const gradFor = (id) => PLACE_GRADS[(id - 1) % 8];

function top4(vv, colors) {
  const VIBE_COLORS = [colors.sage2, colors.sage, colors.gold, colors.txt3];
  if (!vv) return [];
  return Object.entries(vv)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v], i) => ({ key: k, label: VIBE_LABELS[k] || k.toUpperCase(), val: v, color: VIBE_COLORS[i] }));
}

export default function Detail({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, token } = useAuth();
  const { placeId } = route.params;
  const queryClient = useQueryClient();

  const { data: place, isLoading } = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => fetchPlace(placeId),
  });

  const { data: savedPlaces = [] } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => fetchSaved(token),
    enabled: !!token,
  });

  const isSaved = savedPlaces.some((p) => p.id === placeId);

  const saveMutation = useMutation({
    mutationFn: () => isSaved ? unsavePlace(token, placeId) : savePlace(token, placeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved', user?.id] }),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </SafeAreaView>
    );
  }

  if (!place) return null;

  const dims = top4(place.vibe?.vibe_vector, colors);
  const chips = dims.slice(0, 3).map((d) => d.label);
  if (place.vibe?.crowd) chips.push(place.vibe.crowd.toUpperCase());

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {place.image_url ? (
        <View style={styles.heroImgWrap}>
          <Image source={{ uri: place.image_url }} style={styles.heroImg} resizeMode="cover" />
          <View style={styles.heroImgOverlay} />
        </View>
      ) : (
        <MoodHero
          moodId={route.params?.mood?.id || 'calm'}
          gradColors={gradFor(place.id)}
          height={260}
        />
      )}

      <ScrollView
        style={styles.detSheet}
        contentContainerStyle={styles.detSheetContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 28 }} />
        <View style={styles.detSheetInner}>
          <View style={styles.detPill} />
          <View style={styles.detBody}>
            <Text style={styles.detName}>{place.name}</Text>
            <View style={styles.detMeta}>
              <Text style={styles.detRating}>★ {place.rating.toFixed(1)}</Text>
              <Text style={styles.detMetaTxt}>{['', '$', '$$', '$$$', '$$$$'][place.price_range]}</Text>
            </View>
            {place.address ? (
              <Text style={styles.detAddress} numberOfLines={2}>📍 {place.address}</Text>
            ) : null}

            {chips.length > 0 && (
              <View style={styles.detChips}>
                {chips.map((c) => (
                  <View key={c} style={styles.dChip}>
                    <Text style={styles.dChipTxt}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {place.vibe?.summary && (
              <View style={styles.aiBox}>
                <Text style={styles.aiLbl}>AI VIBE READ</Text>
                <Text style={styles.aiTxt}>{place.vibe.summary}</Text>
              </View>
            )}

            {dims.length > 0 && (
              <View style={styles.vibeBars}>
                {dims.map((d) => (
                  <View key={d.key} style={styles.vbRow}>
                    <Text style={styles.vbLbl}>{d.label}</Text>
                    <View style={styles.vbTrack}>
                      <View style={[styles.vbFill, { width: `${d.val * 100}%`, backgroundColor: d.color }]} />
                    </View>
                    <Text style={styles.vbVal}>{d.val.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 160 }} />
          </View>
        </View>
      </ScrollView>

      {/* Floating action bar — glassmorphism */}
      <View style={styles.fabBar}>
        <Pressable style={styles.fabBack} onPress={() => navigation.goBack()}>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={styles.glassOverlay} />
          <Text style={styles.fabBackTxt}>← BACK</Text>
        </Pressable>
        <Pressable
          style={[styles.fabSave, isSaved && { backgroundColor: colors.brown, borderColor: colors.brown }]}
          onPress={() => saveMutation.mutate()}
        >
          {!isSaved && <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
          {!isSaved && <View style={styles.glassOverlay} />}
          <Text style={styles.fabSaveIco}>{isSaved ? '❤️' : '🤍'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

    detSheet: { position: 'absolute', top: 210, bottom: 0, left: 0, right: 0 },
    detSheetContent: { minHeight: '100%' },
    detSheetInner: { backgroundColor: colors.bg === '#0C0B09' ? 'rgba(10,9,7,0.97)' : 'rgba(242,237,230,0.97)', minHeight: 500, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
    detPill: { width: 34, height: 3, backgroundColor: colors.border2, borderRadius: 3, alignSelf: 'center', marginTop: 14, marginBottom: 16 },
    detBody: { paddingHorizontal: 20, paddingTop: 4 },

    heroImgWrap: { height: 260, width: '100%', overflow: 'hidden' },
    heroImg: { width: '100%', height: '100%' },
    heroImgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },

    detName: { fontFamily: fonts.display, fontSize: 26, color: colors.txt, letterSpacing: 0.5, lineHeight: 32 },
    detMeta: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
    detRating: { fontSize: 12, color: colors.gold, fontWeight: '700' },
    detMetaTxt: { fontSize: 12, color: colors.txt2 },
    detAddress: { fontSize: 12, color: colors.txt3, marginTop: 6, lineHeight: 17 },

    detChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 9 },
    dChip: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: 3, paddingHorizontal: 9, paddingVertical: 3 },
    dChipTxt: { fontSize: 9, color: colors.txt2, fontWeight: '600', letterSpacing: 0.5 },

    aiBox: { backgroundColor: 'rgba(107,143,94,0.10)', borderWidth: 1, borderColor: 'rgba(107,143,94,0.25)', borderRadius: radius.card, padding: 12, marginTop: 11 },
    aiLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.sage, marginBottom: 5 },
    aiTxt: { fontSize: 11, color: colors.sage === '#7EC87A' ? '#5aaa70' : '#4a5a48', lineHeight: 18 },

    vibeBars: { marginTop: 11, gap: 7 },
    vbRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    vbLbl: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.txt2, width: 72, flexShrink: 0 },
    vbTrack: { flex: 1, height: 4, backgroundColor: colors.border2, borderRadius: 2, overflow: 'hidden' },
    vbFill: { height: '100%', borderRadius: 2 },
    vbVal: { fontSize: 9, color: colors.txt3, width: 26, textAlign: 'right' },

    fabBar: { position: 'absolute', bottom: 80, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18 },
    fabBack: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 26, paddingVertical: 15,
      overflow: 'hidden', borderRadius: 30,
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)',
      backgroundColor: 'rgba(255,255,255,0.10)',
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22, shadowRadius: 20, elevation: 10,
    },
    glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.18)' },
    fabBackTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.txt, letterSpacing: 2 },
    fabSave: {
      width: 56, height: 56, borderRadius: 28,
      overflow: 'hidden',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)',
      backgroundColor: 'rgba(255,255,255,0.10)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22, shadowRadius: 20, elevation: 10,
    },
    fabSaveIco: { fontSize: 22 },
  });
}
