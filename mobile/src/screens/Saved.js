import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FadeImage from '../components/FadeImage';
import { fetchSaved, unsavePlace } from '../services/api';
import { fonts, radius } from '../constants/theme';
import StatusRow from '../components/StatusRow';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const PLACE_GRADS = [
  ['#c8ddd0', '#6b8f5e'], ['#e0d0ec', '#b09ac0'], ['#f0d8c0', '#e8c4a0'],
  ['#f0e0c0', '#e8d4a8'], ['#c8d8e8', '#7a9ab0'], ['#f0d0d8', '#c07a8a'],
  ['#c8e0d8', '#6aaa98'], ['#d8dcc0', '#a0a868'],
];
const gradFor = (id) => PLACE_GRADS[(id - 1) % 8];

const VIBE_LABELS = {
  calm: 'CALM', aesthetic: 'AESTHETIC', lively: 'LIVELY', social: 'SOCIAL',
  premium: 'PREMIUM', budget: 'BUDGET', work_friendly: 'WORK', date_friendly: 'DATE',
};

function topDims(vv, n = 2) {
  if (!vv) return '';
  return Object.entries(vv).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k]) => VIBE_LABELS[k] || k.toUpperCase()).join(' · ');
}

export default function Saved({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  const { data: saved = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => fetchSaved(token),
    enabled: !!token,
  });

  const unsaveMutation = useMutation({
    mutationFn: (placeId) => unsavePlace(token, placeId),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      queryClient.invalidateQueries({ queryKey: ['saved', user?.id] });
    },
  });

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.errorCenter]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text style={styles.errorTxt}>Couldn't load saves</Text>
        <Pressable style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryTxt}>TRY AGAIN</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StatusRow />

      <View style={styles.savedTop}>
        <View>
          <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
          <Text style={styles.title}>SAVED VYBES</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countTxt}>{saved.length} PLACES</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      )}

      <FlatList
        data={saved}
        keyExtractor={(item) => String(item.id)}
        onRefresh={refetch}
        refreshing={isLoading}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.savedItem}
            onPress={() => navigation.navigate('Detail', { placeId: item.id })}
          >
            <Text style={styles.itemNum}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.itemVisual}>
              <LinearGradient colors={gradFor(item.id)} start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {item.image_url && (
                <FadeImage source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} />
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name.toUpperCase()}</Text>
              {item.vibe?.vibe_vector && (
                <Text style={styles.itemVibe}>{topDims(item.vibe.vibe_vector)}</Text>
              )}
              <Text style={styles.itemMeta}>★ {item.rating.toFixed(1)} · {['', '$', '$$', '$$$', '$$$$'][item.price_range]}</Text>
              {item.vibe?.crowd && (
                <View style={styles.itemChips}>
                  <View style={styles.savedSc}>
                    <Text style={styles.savedScTxt}>{item.vibe.crowd}</Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.itemArr}>
              <View style={styles.arrIco}>
                <Text style={{ fontSize: 10, color: colors.txt }}>→</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyTxt}>Tap the heart on any place to save it</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    savedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
    eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: colors.sage, marginBottom: 2 },
    title: { fontFamily: fonts.display, fontSize: 30, color: colors.txt, letterSpacing: 1, lineHeight: 30 },
    countBadge: { borderWidth: 1, borderColor: colors.border2, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.glass },
    countTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.txt3 },

    listContent: { paddingBottom: 32 },

    savedItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border2 },
    itemNum: { fontFamily: fonts.display, fontSize: 36, color: colors.ink, width: 36, flexShrink: 0, lineHeight: 40, textAlign: 'right' },
    itemVisual: { width: 72, height: 72, borderRadius: radius.card, overflow: 'hidden', flexShrink: 0 },
    itemInfo: { flex: 1 },
    itemName: { fontFamily: fonts.display, fontSize: 17, color: colors.txt, letterSpacing: 0.5, lineHeight: 17 },
    itemVibe: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: colors.sage, marginTop: 3 },
    itemMeta: { fontSize: 10, color: colors.txt3, marginTop: 4 },
    itemChips: { flexDirection: 'row', gap: 4, marginTop: 5 },
    savedSc: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2 },
    savedScTxt: { fontSize: 9, color: colors.txt2 },
    itemArr: { alignItems: 'flex-end', paddingTop: 4 },
    arrIco: { width: 22, height: 22, borderRadius: 3, backgroundColor: colors.glass2, alignItems: 'center', justifyContent: 'center' },

    center: { paddingTop: 80, alignItems: 'center', gap: 12 },
    emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.txt, letterSpacing: 1 },
    emptyTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.txt2, textAlign: 'center', paddingHorizontal: 40 },
    errorCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorTxt: { fontFamily: fonts.display, fontSize: 18, color: colors.txt, letterSpacing: 1 },
    retryBtn: { backgroundColor: colors.sage, borderRadius: 4, paddingHorizontal: 24, paddingVertical: 10 },
    retryTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#fff' },
  });
}
