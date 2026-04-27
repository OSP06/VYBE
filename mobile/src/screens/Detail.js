import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, SafeAreaView, StatusBar,
  Linking, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import FadeImage from '../components/FadeImage';
import { BlurView } from 'expo-blur';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPlace, savePlace, unsavePlace, fetchSaved, submitVibeFeedback } from '../services/api';
import { fonts, radius } from '../constants/theme';
import MoodHero from '../components/MoodHero';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmt12(hour, minute = 0) {
  const ampm = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  return minute ? `${h}:${String(minute).padStart(2, '0')}${ampm}` : `${h}${ampm}`;
}

function parseHours(periods) {
  if (!periods?.length) return null;
  const now = new Date();
  const googleDay = (now.getDay()); // JS getDay: 0=Sun matches Google
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const byDay = {};
  for (const p of periods) {
    const day = p?.open?.day;
    if (day == null) continue;
    const openStr = fmt12(p.open.hour, p.open.minute);
    const closeStr = p.close ? fmt12(p.close.hour, p.close.minute) : 'Late';
    byDay[day] = `${openStr} – ${closeStr}`;
  }

  let isOpenNow = false;
  for (const p of periods) {
    try {
      const oDay = p.open.day, oMins = p.open.hour * 60 + (p.open.minute || 0);
      const cDay = p.close?.day, cMins = p.close ? p.close.hour * 60 + (p.close.minute || 0) : 1440;
      if (oDay === googleDay) {
        if (cDay === googleDay ? (currentMins >= oMins && currentMins <= cMins) : currentMins >= oMins) isOpenNow = true;
      } else if (cDay === googleDay && currentMins <= cMins) isOpenNow = true;
    } catch {}
  }

  return { byDay, isOpenNow, todayDay: googleDay };
}

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
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { user, token } = useAuth();
  const { placeId } = route.params;
  const queryClient = useQueryClient();
  const [selectedVerifyMood, setSelectedVerifyMood] = useState(null);
  const [verifyDone, setVerifyDone] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const fromSaved = !route.params?.mood;

  const { data: place, isLoading, isError, refetch } = useQuery({
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
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      queryClient.invalidateQueries({ queryKey: ['saved', user?.id] });
    },
  });

  const openDirections = () => {
    if (!place) return;
    const label = encodeURIComponent(place.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${place.lat},${place.lng}`,
      android: `geo:${place.lat},${place.lng}?q=${place.lat},${place.lng}(${label})`,
    });
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`)
    );
  };

  const handleVerify = (feltRight) => {
    if (!selectedVerifyMood) return;
    setVerifyDone(true);
    submitVibeFeedback(token, placeId, selectedVerifyMood, feltRight).catch(() => {});
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </SafeAreaView>
    );
  }

  if (isError || !place) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorTxt}>Something went wrong</Text>
        <Pressable style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryTxt}>TRY AGAIN</Text>
        </Pressable>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkTxt}>← BACK</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const dims = top4(place.vibe?.vibe_vector, colors);
  const chips = dims.slice(0, 3).map((d) => d.label);
  if (place.vibe?.crowd) chips.push(place.vibe.crowd.toUpperCase());

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {place.image_url ? (
        <View style={styles.heroImgWrap}>
          <FadeImage source={{ uri: place.image_url }} style={styles.heroImg} />
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
              <Pressable onPress={openDirections}>
                <Text style={styles.detAddress} numberOfLines={2}>📍 {place.address}</Text>
              </Pressable>
            ) : null}

            {/* Hours + Directions row */}
            {(() => {
              const hours = parseHours(place.opening_hours);
              return (
                <View style={styles.hoursRow}>
                  {hours ? (
                    <Pressable style={styles.hoursLeft} onPress={() => setShowAllHours(v => !v)}>
                      <View style={[styles.openBadge, { backgroundColor: hours.isOpenNow ? 'rgba(107,143,94,0.15)' : 'rgba(180,80,80,0.12)' }]}>
                        <Text style={[styles.openBadgeTxt, { color: hours.isOpenNow ? colors.sage : '#C0504D' }]}>
                          {hours.isOpenNow ? '● OPEN NOW' : '○ CLOSED'}
                        </Text>
                      </View>
                      {hours.byDay[hours.todayDay] && (
                        <Text style={styles.todayHours}>{hours.byDay[hours.todayDay]} {showAllHours ? '▴' : '▾'}</Text>
                      )}
                    </Pressable>
                  ) : (
                    <Text style={styles.hoursUnavailable}>Hours unavailable</Text>
                  )}
                  <Pressable style={styles.directionsBtn} onPress={openDirections}>
                    <Text style={styles.directionsTxt}>DIRECTIONS →</Text>
                  </Pressable>
                </View>
              );
            })()}

            {showAllHours && place.opening_hours && (() => {
              const hours = parseHours(place.opening_hours);
              return (
                <View style={styles.allHoursBox}>
                  {DAY_NAMES.map((name, i) => (
                    hours.byDay[i] ? (
                      <View key={i} style={styles.allHoursRow}>
                        <Text style={[styles.allHoursDay, i === hours.todayDay && { color: colors.sage }]}>{name}</Text>
                        <Text style={[styles.allHoursTime, i === hours.todayDay && { color: colors.txt }]}>{hours.byDay[i]}</Text>
                      </View>
                    ) : null
                  ))}
                </View>
              );
            })()}

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
                  </View>
                ))}
              </View>
            )}

            {fromSaved && (
              <View style={styles.vibeRateBox}>
                <Text style={styles.vibeRateLbl}>RATE THE VIBE</Text>
                {verifyDone ? (
                  <Text style={styles.vibeRateThanks}>Thanks! We'll use this to improve rankings. ✓</Text>
                ) : (
                  <>
                    <Text style={styles.vibeRateSub}>Which mood were you in when you visited?</Text>
                    <View style={styles.vibeRateMoods}>
                      {['calm','aesthetic','energetic','social','focus','romantic','explore','budget_chill'].map((id) => (
                        <Pressable
                          key={id}
                          style={[styles.vibeRateChip, selectedVerifyMood === id && styles.vibeRateChipOn]}
                          onPress={() => setSelectedVerifyMood(id)}
                        >
                          <Text style={[styles.vibeRateChipTxt, selectedVerifyMood === id && styles.vibeRateChipTxtOn]}>
                            {id === 'budget_chill' ? 'CHILL' : id.toUpperCase()}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.vibeRateBtns}>
                      <Pressable
                        style={[styles.vibeRateYes, !selectedVerifyMood && { opacity: 0.4 }]}
                        onPress={() => handleVerify(true)}
                        disabled={!selectedVerifyMood}
                      >
                        <Text style={styles.vibeRateYesTxt}>YES, NAILED IT ✓</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.vibeRateNo, !selectedVerifyMood && { opacity: 0.4 }]}
                        onPress={() => handleVerify(false)}
                        disabled={!selectedVerifyMood}
                      >
                        <Text style={styles.vibeRateNoTxt}>NOT REALLY</Text>
                      </Pressable>
                    </View>
                  </>
                )}
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

function makeStyles(colors, isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 12 },
    errorTxt: { fontFamily: fonts.display, fontSize: 18, color: colors.txt, letterSpacing: 1 },
    retryBtn: { backgroundColor: colors.sage, borderRadius: 4, paddingHorizontal: 24, paddingVertical: 10 },
    retryTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#fff' },
    backLink: { paddingVertical: 8 },
    backLinkTxt: { fontSize: 11, color: colors.txt3, letterSpacing: 1 },

    detSheet: { position: 'absolute', top: 210, bottom: 0, left: 0, right: 0 },
    detSheetContent: { minHeight: '100%' },
    detSheetInner: { backgroundColor: isDark ? 'rgba(10,9,7,0.97)' : 'rgba(242,237,230,0.97)', minHeight: 500, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
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

    hoursRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    hoursLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    openBadge: { borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3 },
    openBadgeTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    todayHours: { fontSize: 10, color: colors.txt2 },
    hoursUnavailable: { fontSize: 10, color: colors.txt3, fontStyle: 'italic' },
    directionsBtn: { backgroundColor: colors.sage, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7 },
    directionsTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: '#fff' },

    allHoursBox: { marginTop: 8, borderWidth: 1, borderColor: colors.border2, borderRadius: 6, padding: 10, gap: 4, backgroundColor: colors.glass },
    allHoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
    allHoursDay: { fontSize: 10, fontWeight: '600', color: colors.txt3, width: 36 },
    allHoursTime: { fontSize: 10, color: colors.txt2 },

    detChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 9 },
    dChip: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: 3, paddingHorizontal: 9, paddingVertical: 3 },
    dChipTxt: { fontSize: 9, color: colors.txt2, fontWeight: '600', letterSpacing: 0.5 },

    aiBox: { backgroundColor: 'rgba(107,143,94,0.10)', borderWidth: 1, borderColor: 'rgba(107,143,94,0.25)', borderRadius: radius.card, padding: 12, marginTop: 11 },
    aiLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.sage, marginBottom: 5 },
    aiTxt: { fontSize: 11, color: isDark ? '#5aaa70' : '#4a5a48', lineHeight: 18 },

    vibeBars: { marginTop: 11, gap: 7 },
    vbRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    vbLbl: { fontFamily: fonts.bodyMed, fontSize: 10, color: colors.txt2, width: 72, flexShrink: 0 },
    vbTrack: { flex: 1, height: 4, backgroundColor: colors.border2, borderRadius: 2, overflow: 'hidden' },
    vbFill: { height: '100%', borderRadius: 2 },

    vibeRateBox: {
      marginTop: 18, borderWidth: 1, borderColor: colors.border2,
      borderRadius: radius.card, padding: 14,
      backgroundColor: colors.glass,
    },
    vibeRateLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.sage, marginBottom: 6 },
    vibeRateSub: { fontSize: 11, color: colors.txt2, marginBottom: 10 },
    vibeRateThanks: { fontSize: 12, color: colors.sage, fontStyle: 'italic' },
    vibeRateMoods: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
    vibeRateChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 3, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.glass },
    vibeRateChipOn: { backgroundColor: colors.sage, borderColor: colors.sage },
    vibeRateChipTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: colors.txt2 },
    vibeRateChipTxtOn: { color: '#fff' },
    vibeRateBtns: { flexDirection: 'row', gap: 8 },
    vibeRateYes: { flex: 1, backgroundColor: colors.sage, borderRadius: 4, paddingVertical: 10, alignItems: 'center' },
    vibeRateYesTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#fff' },
    vibeRateNo: { flex: 1, borderWidth: 1, borderColor: colors.border2, borderRadius: 4, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.glass },
    vibeRateNoTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.txt2 },

    fabBar: { position: 'absolute', bottom: 80, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18 },
    fabBack: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 26, paddingVertical: 15,
      overflow: 'hidden', borderRadius: 4,
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)',
      backgroundColor: 'rgba(255,255,255,0.10)',
      shadowColor: '#A67C52', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18, shadowRadius: 20, elevation: 10,
    },
    glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.18)' },
    fabBackTxt: { fontFamily: fonts.display, fontSize: 15, color: colors.txt, letterSpacing: 2 },
    fabSave: {
      width: 56, height: 56, borderRadius: 4,
      overflow: 'hidden',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)',
      backgroundColor: 'rgba(255,255,255,0.10)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#A67C52', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18, shadowRadius: 20, elevation: 10,
    },
    fabSaveIco: { fontSize: 22 },
  });
}
