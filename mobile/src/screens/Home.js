import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal,
  ActivityIndicator, SafeAreaView, ScrollView, StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { fetchPlaces, fetchCities, fetchNeighborhoods, savePlace, unsavePlace, fetchSaved } from '../services/api';
import { fonts, radius } from '../constants/theme';
import { MOODS } from '../constants/moods';
import StatusRow from '../components/StatusRow';
import SwipeStack from '../components/SwipeStack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function Home({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, token } = useAuth();
  const [activeMood, setActiveMood] = useState(route.params.mood);
  const [neighborhood, setNeighborhood] = useState(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch { setLocationError(true); }
    })();
  }, []);

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: fetchCities,
  });
  const city = cities[0] || null;

  const { data: neighborhoods = [] } = useQuery({
    queryKey: ['neighborhoods', city?.id],
    queryFn: () => fetchNeighborhoods(city?.id ?? 1),
    enabled: !!city,
  });

  const { data: places = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['places', activeMood.id, neighborhood, userLocation?.lat, nearMeOnly],
    queryFn: () => fetchPlaces(activeMood.id, city?.id ?? 1, 20, neighborhood, userLocation?.lat, userLocation?.lng, false, nearMeOnly && userLocation ? 5 : null),
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

  const handleSave = (placeId) => {
    saveMutation.mutate({ placeId, isSaved: savedIds.has(placeId) });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StatusRow />

      {/* City row — tap ▾ to open area picker */}
      <View style={styles.feedHd}>
        <Pressable style={styles.cityRow} onPress={() => setShowAreaPicker(true)}>
          <Text style={styles.feedCity}>{city ? city.name.toUpperCase() : '—'}</Text>
          <Text style={styles.feedArrow}>▾</Text>
          {neighborhood && (
            <View style={styles.neighborhoodBadge}>
              <Text style={styles.neighborhoodBadgeTxt}>{neighborhood}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {userLocation && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNearMeOnly(v => !v); }}
              style={[styles.nearMeBtn, nearMeOnly && styles.nearMeBtnOn]}
            >
              <Text style={[styles.nearMeTxt, nearMeOnly && styles.nearMeTxtOn]}>
                {nearMeOnly ? '◎ NEAR ME' : '◎ NEAR ME'}
              </Text>
            </Pressable>
          )}
          <Pressable onPress={refetch} hitSlop={10} style={styles.refreshBtn}>
            <Text style={styles.refreshIco}>↻</Text>
          </Pressable>
        </View>
      </View>

      {/* Area picker modal */}
      <Modal visible={showAreaPicker} transparent animationType="fade" onRequestClose={() => setShowAreaPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAreaPicker(false)}>
          <View style={styles.areaModal}>
            <Text style={styles.areaModalTitle}>SELECT AREA</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                style={[styles.areaOption, !neighborhood && styles.areaOptionOn]}
                onPress={() => { setNeighborhood(null); setShowAreaPicker(false); }}
              >
                <Text style={[styles.areaOptionTxt, !neighborhood && styles.areaOptionTxtOn]}>All of {city?.name}</Text>
              </Pressable>
              {neighborhoods.filter(n => n !== city?.name).map((n) => (
                <Pressable
                  key={n}
                  style={[styles.areaOption, neighborhood === n && styles.areaOptionOn]}
                  onPress={() => { setNeighborhood(n); setShowAreaPicker(false); }}
                >
                  <Text style={[styles.areaOptionTxt, neighborhood === n && styles.areaOptionTxtOn]}>{n}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Mood chips — fixed height row */}
      <View style={styles.chipRowWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {MOODS.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.chip, m.id === activeMood.id && styles.chipOn]}
              onPress={() => setActiveMood(m)}
            >
              <Text style={[styles.chipTxt, m.id === activeMood.id && styles.chipTxtOn]}>{m.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.rankBadgeRow}>
        <Text style={styles.rankBadgeTxt}>RANKED BY VIBE FIT · NOT STARS</Text>
      </View>

      {/* Swipe stack */}
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.loadingTxt}>Finding your vibe...</Text>
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorTxt}>Couldn't load places.</Text>
            <Pressable onPress={refetch} style={styles.retryBtn}>
              <Text style={styles.retryTxt}>TRY AGAIN</Text>
            </Pressable>
          </View>
        ) : places.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No places for this vibe</Text>
            <Text style={styles.emptyTxt}>{nearMeOnly ? 'Nothing within 5km — try turning off Near Me' : neighborhood ? 'Try a different area' : 'Try another mood'}</Text>
          </View>
        ) : (
          <SwipeStack
            places={places}
            colors={colors}
            savedIds={savedIds}
            mood={activeMood}
            onPress={(place) => navigation.navigate('Detail', { placeId: place.id, mood: activeMood })}
            onSave={handleSave}
            onSeeAll={() => navigation.navigate('SeeAll', { mood: activeMood, neighborhood, cityId: city?.id ?? 1, userLat: userLocation?.lat, userLng: userLocation?.lng })}
          />
        )}
      </View>

      {!isLoading && places.length > 0 && (
        <Pressable
          style={styles.seeAllBar}
          onPress={() => navigation.navigate('SeeAll', { mood: activeMood, neighborhood, cityId: city?.id ?? 1, userLat: userLocation?.lat, userLng: userLocation?.lng })}
        >
          <Text style={styles.seeAllTxt}>SEE ALL {activeMood.label.toUpperCase()} PLACES{neighborhood ? ` IN ${neighborhood.toUpperCase()}` : ''} →</Text>
        </Pressable>
      )}

    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    feedHd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
    cityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    feedCity: { fontFamily: fonts.display, fontSize: 16, color: colors.txt, letterSpacing: 2 },
    feedArrow: { fontSize: 28, color: colors.txt, marginTop: -7 },
    neighborhoodBadge: { backgroundColor: colors.gold, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 2 },
    neighborhoodBadgeTxt: { fontFamily: fonts.display, fontSize: 9, color: '#fff', letterSpacing: 1 },
    nearMeBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3, borderWidth: 1, borderColor: colors.border2 },
    nearMeBtnOn: { backgroundColor: colors.sage, borderColor: colors.sage },
    nearMeTxt: { fontFamily: fonts.display, fontSize: 8, color: colors.txt3, letterSpacing: 1 },
    nearMeTxtOn: { color: '#fff' },
    refreshBtn: { padding: 2 },
    refreshIco: { fontSize: 14, color: colors.txt3 },

    // Area picker modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    areaModal: { backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 20, paddingBottom: 40, maxHeight: '70%' },
    areaModalTitle: { fontFamily: fonts.display, fontSize: 13, color: colors.txt3, letterSpacing: 3, textAlign: 'center', marginBottom: 12 },
    areaOption: { paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border2 },
    areaOptionOn: { backgroundColor: colors.sage + '18' },
    areaOptionTxt: { fontFamily: fonts.display, fontSize: 14, color: colors.txt, letterSpacing: 0.5 },
    areaOptionTxtOn: { color: colors.sage },

    // Mood chips — fixed height
    chipRowWrap: { height: 44 },
    chipRow: { paddingHorizontal: 16, alignItems: 'center', gap: 6 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 3, borderWidth: 1, borderColor: colors.border2 },
    chipOn: { backgroundColor: colors.sage, borderColor: colors.sage },
    chipTxt: { fontFamily: fonts.display, fontSize: 10, color: colors.txt2, letterSpacing: 1 },
    chipTxtOn: { color: '#fff' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    loadingTxt: { fontSize: 12, color: colors.txt3, fontFamily: fonts.body },
    errorTxt: { fontSize: 13, color: colors.txt2 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: colors.border2 },
    retryTxt: { fontFamily: fonts.display, fontSize: 12, color: colors.txt, letterSpacing: 1 },
    emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.txt },
    emptyTxt: { fontSize: 12, color: colors.txt3 },

    rankBadgeRow: { paddingHorizontal: 16, paddingVertical: 4 },
    rankBadgeTxt: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: colors.txt3 },

    seeAllBar: { paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border2, backgroundColor: colors.bg },
    seeAllTxt: { fontFamily: fonts.display, fontSize: 12, color: colors.sage, letterSpacing: 1.5 },
  });
}
