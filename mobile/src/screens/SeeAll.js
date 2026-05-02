import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPlaces, fetchSaved, savePlace, unsavePlace } from '../services/api';
import { fonts, radius } from '../constants/theme';
import { FOOD_EMOJI } from '../constants/foods';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import FadeImage from '../components/FadeImage';

const PRICE = ['', '$', '$$', '$$$', '$$$$'];
const PLACE_GRADS = [
  ['#c8ddd0', '#6b8f5e'], ['#e0d0ec', '#b09ac0'], ['#f0d8c0', '#e8c4a0'],
  ['#f0e0c0', '#e8d4a8'], ['#c8d8e8', '#7a9ab0'], ['#f0d0d8', '#c07a8a'],
  ['#c8e0d8', '#6aaa98'], ['#d8dcc0', '#a0a868'],
];
const gradFor = (id) => PLACE_GRADS[(id - 1) % 8];

export default function SeeAll({ navigation, route }) {
  const { mood, food = null, neighborhood, cityId = 1, userLat, userLng, openNow = false } = route.params;
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['seeAll', mood?.id, food?.id, neighborhood, userLat, userLng, openNow],
    queryFn: () => fetchPlaces(mood?.id ?? null, cityId, 60, neighborhood, userLat, userLng, openNow, null, food?.id ?? null),
  });

  const { data: savedPlaces = [] } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => fetchSaved(token),
    enabled: !!token,
  });

  const savedIds = new Set(savedPlaces.map((p) => p.id));

  const saveMutation = useMutation({
    mutationFn: ({ placeId, isSaved }) =>
      isSaved ? unsavePlace(token, placeId) : savePlace(token, placeId),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      queryClient.invalidateQueries({ queryKey: ['saved', user?.id] });
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← BACK</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>
            {mood ? mood.label.toUpperCase() : food?.label?.toUpperCase() || 'PLACES'}
            {mood && food ? ` + ${food.label.toUpperCase()}` : ''}
          </Text>
          {neighborhood && <Text style={styles.sub}>{neighborhood}</Text>}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('Detail', { placeId: item.id, mood })}
            >
              <View style={styles.cardImg}>
                <LinearGradient colors={gradFor(item.id)} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                {item.image_url && (
                  <FadeImage source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} />
                )}
                <Pressable
                  style={styles.heartBtn}
                  onPress={() => saveMutation.mutate({ placeId: item.id, isSaved: savedIds.has(item.id) })}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 16 }}>{savedIds.has(item.id) ? '❤️' : '🤍'}</Text>
                </Pressable>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.neighborhood || ''}</Text>
                {item.food_tags?.length > 0 && (
                  <Text style={styles.cardFoodTags} numberOfLines={1}>
                    {item.food_tags.slice(0, 3).map((t) => `${FOOD_EMOJI[t] || ''}${t}`).join('  ')}
                  </Text>
                )}
                <View style={styles.cardFoot}>
                  <Text style={styles.cardRating}>★ {item.rating.toFixed(1)}</Text>
                  <Text style={styles.cardPrice}>{PRICE[item.price_range]}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
    backBtn: { width: 60 },
    backTxt: { fontFamily: fonts.display, fontSize: 13, color: colors.txt, letterSpacing: 1 },
    title: { fontFamily: fonts.display, fontSize: 22, color: colors.txt, letterSpacing: 1, textAlign: 'center' },
    sub: { fontSize: 11, color: colors.txt3, textAlign: 'center', marginTop: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    grid: { paddingHorizontal: 12, paddingBottom: 40 },
    row: { justifyContent: 'space-between', marginBottom: 12 },
    card: { width: '48.5%', borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.bg2 },
    cardImg: { height: 120 },
    heartBtn: { position: 'absolute', top: 6, right: 6 },
    cardBody: { padding: 10, gap: 3 },
    cardName: { fontFamily: fonts.display, fontSize: 14, color: colors.txt, letterSpacing: 0.3 },
    cardSub: { fontSize: 10, color: colors.txt3 },
    cardFoodTags: { fontSize: 9, color: colors.txt3, marginTop: 1 },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    cardRating: { fontSize: 10, color: colors.gold, fontWeight: '700' },
    cardPrice: { fontSize: 10, color: colors.txt2 },
  });
}
