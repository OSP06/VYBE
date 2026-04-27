import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaces } from '../services/api';
import { fonts, radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const PRICE = ['', '$', '$$', '$$$', '$$$$'];
const PLACE_GRADS = [
  ['#c8ddd0', '#6b8f5e'], ['#e0d0ec', '#b09ac0'], ['#f0d8c0', '#e8c4a0'],
  ['#f0e0c0', '#e8d4a8'], ['#c8d8e8', '#7a9ab0'], ['#f0d0d8', '#c07a8a'],
  ['#c8e0d8', '#6aaa98'], ['#d8dcc0', '#a0a868'],
];
const gradFor = (id) => PLACE_GRADS[(id - 1) % 8];

export default function SeeAll({ navigation, route }) {
  const { mood, neighborhood, cityId = 1 } = route.params;
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: places = [], isLoading } = useQuery({
    queryKey: ['seeAll', mood.id, neighborhood],
    queryFn: () => fetchPlaces(mood.id, cityId, 60, neighborhood),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← BACK</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>{mood.label.toUpperCase()}</Text>
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
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={gradFor(item.id)} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.neighborhood || ''}</Text>
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
    card: { width: '48.5%', borderRadius: 8, overflow: 'hidden', backgroundColor: colors.bg2 },
    cardImg: { height: 120 },
    cardBody: { padding: 10, gap: 3 },
    cardName: { fontFamily: fonts.display, fontSize: 14, color: colors.txt, letterSpacing: 0.3 },
    cardSub: { fontSize: 10, color: colors.txt3 },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    cardRating: { fontSize: 10, color: colors.gold, fontWeight: '700' },
    cardPrice: { fontSize: 10, color: colors.txt2 },
  });
}
