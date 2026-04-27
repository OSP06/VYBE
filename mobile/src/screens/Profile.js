import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  SafeAreaView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { fetchSaved } from '../services/api';
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

const MOOD_HISTORY = [
  { label: 'CALM × 18', hi: true },
  { label: 'AESTHETIC × 12', hi: false },
  { label: 'ROMANTIC × 8', hi: false },
  { label: 'FOCUS × 6', hi: false },
  { label: 'EXPLORE × 4', hi: false },
];

const DNA_BARS = [
  { label: 'CALM', pct: 82, colorKey: 'sage2' },
  { label: 'AESTHETIC', pct: 66, color: '#b09ac0' },
  { label: 'PREMIUM', pct: 52, colorKey: 'gold' },
  { label: 'SOCIAL', pct: 36, color: '#c0a890' },
];

function SecHeader({ num, label, styles }) {
  return (
    <View style={styles.profSecHd}>
      <Text style={styles.profSecNum}>{num}</Text>
      <Text style={styles.profSecLbl}>{label}</Text>
      <View style={styles.profSecLine} />
    </View>
  );
}

export default function Profile({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [editOpen, setEditOpen] = useState(false);
  const { user, token, logout } = useAuth();

  const { data: saved = [] } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => fetchSaved(token),
    enabled: !!token,
  });

  const recentPlaces = saved.slice(0, 4);

  const dnaColors = (bar) => bar.colorKey ? colors[bar.colorKey] : bar.color;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StatusRow />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerBar}>
          <Text style={styles.headerLbl}>YOUR PROFILE</Text>
          <Pressable style={styles.editBtn} onPress={() => setEditOpen(!editOpen)}>
            <Text style={styles.editBtnTxt}>EDIT VYBE</Text>
          </Pressable>
        </View>

        <View style={styles.profHeroBand}>
          <View style={styles.profHeroVis}>
            <LinearGradient
              colors={['#c8ddd0', '#a3b8a8', '#c0e0c8']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.profHeroBgTxt}>FEEL{'\n'}FIRST</Text>
            <Text style={styles.profHeroDate}>SF · 2025</Text>
          </View>
          <View style={styles.profHeroInfo}>
            <View style={styles.profAv}>
              <Text style={styles.profAvTxt}>
                {user?.display_name ? user.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : user?.email?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.profName}>{user?.display_name?.toUpperCase() || user?.email?.split('@')[0]?.toUpperCase() || 'VYBER'}</Text>
            <Text style={styles.profHandle}>{user?.email || ''}</Text>
            <Text style={styles.profBio}>"chasing slow mornings & aesthetic corners across the city"</Text>
            <View style={styles.profStatsRow}>
              <View style={styles.pst}>
                <Text style={styles.pstN}>{saved.length}</Text>
                <Text style={styles.pstL}>SAVED</Text>
              </View>
              <View style={[styles.pst, styles.pstMid]}>
                <Text style={styles.pstN}>0</Text>
                <Text style={styles.pstL}>VISITED</Text>
              </View>
              <View style={styles.pst}>
                <Text style={styles.pstN}>5</Text>
                <Text style={styles.pstL}>MOODS</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.profSec}>
          <SecHeader num="01" label="MOOD HISTORY" styles={styles} />
          <View style={styles.moodHistRow}>
            {MOOD_HISTORY.map((m) => (
              <View key={m.label} style={[styles.mhp, m.hi ? styles.mhpHi : styles.mhpLo]}>
                <Text style={[styles.mhpTxt, m.hi ? styles.mhpTxtHi : styles.mhpTxtLo]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.profSec}>
          <SecHeader num="02" label="VIBE DNA" styles={styles} />
          {DNA_BARS.map((bar) => (
            <View key={bar.label} style={styles.dnaRow}>
              <Text style={styles.dnaLbl}>{bar.label}</Text>
              <View style={styles.dnaTrack}>
                <View style={[styles.dnaFill, { width: `${bar.pct}%`, backgroundColor: dnaColors(bar) }]} />
              </View>
              <Text style={styles.dnaVal}>{bar.pct}%</Text>
            </View>
          ))}
        </View>

        {recentPlaces.length > 0 && (
          <>
            <View style={styles.profSec}>
              <SecHeader num="03" label="RECENT PLACES" styles={styles} />
            </View>
            <View style={styles.profPgrid}>
              {recentPlaces.map((place) => (
                <Pressable
                  key={place.id}
                  style={styles.profPgc}
                  onPress={() => navigation.navigate('Detail', { placeId: place.id })}
                >
                  <View style={styles.profPgcImg}>
                    <LinearGradient colors={gradFor(place.id)} start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Text style={styles.profPgcN} numberOfLines={1}>{place.name}</Text>
                  </View>
                  <View style={styles.profPgcBody}>
                    <Text style={styles.profPgcVibe}>
                      {place.vibe?.vibe_vector
                        ? Object.entries(place.vibe.vibe_vector).sort((a, b) => b[1] - a[1])[0]?.[0]
                            .replace('_friendly', '').toUpperCase()
                        : 'VIBE'}
                    </Text>
                    <Text style={styles.profPgcMeta}>★ {place.rating.toFixed(1)} · {['', '$', '$$', '$$$', '$$$$'][place.price_range]}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={styles.signOutRow}>
          <View style={styles.profSecLine} />
          <Pressable style={styles.signOutBtn} onPress={logout}>
            <Text style={styles.signOutTxt}>SIGN OUT</Text>
          </Pressable>
          <View style={styles.profSecLine} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 0 },
    headerLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: colors.txt3 },
    editBtn: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border2, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 5 },
    editBtnTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.sage },

    profHeroBand: { marginHorizontal: 12, marginTop: 6, borderRadius: radius.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden' },
    profHeroVis: { height: 120, position: 'relative', overflow: 'hidden' },
    profHeroBgTxt: { position: 'absolute', top: '50%', left: 12, fontFamily: fonts.display, fontSize: 42, color: 'rgba(255,255,255,0.22)', letterSpacing: -0.5, lineHeight: 40, marginTop: -40 },
    profHeroDate: { position: 'absolute', top: 8, right: 8, fontSize: 8, fontWeight: '700', letterSpacing: 3, color: 'rgba(255,255,255,0.5)' },
    profHeroInfo: { padding: 14, paddingTop: 12, paddingBottom: 13, backgroundColor: colors.bg === '#0C0B09' ? 'rgba(12,11,9,0.95)' : 'rgba(242,237,230,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)' },
    profAv: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.88)', marginBottom: 8 },
    profAvTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
    profName: { fontFamily: fonts.display, fontSize: 24, color: colors.txt, letterSpacing: 0.5, lineHeight: 24 },
    profHandle: { fontSize: 9, color: colors.txt2, marginTop: 1, letterSpacing: 0.5 },
    profBio: { fontFamily: fonts.mood, fontSize: 11, color: colors.txt2, marginTop: 8, lineHeight: 17 },
    profStatsRow: { flexDirection: 'row', marginTop: 10, borderWidth: 1, borderColor: colors.border2, borderRadius: radius.card, overflow: 'hidden' },
    pst: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
    pstMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border2 },
    pstN: { fontFamily: fonts.display, fontSize: 22, color: colors.txt, letterSpacing: 0.5 },
    pstL: { fontSize: 8, fontWeight: '700', letterSpacing: 2, color: colors.txt3, marginTop: 1 },

    profSec: { paddingHorizontal: 12, paddingTop: 10 },
    profSecHd: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    profSecNum: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
    profSecLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: colors.txt3 },
    profSecLine: { flex: 1, height: 1, backgroundColor: colors.border2 },

    moodHistRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
    mhp: { borderRadius: 3, paddingHorizontal: 11, paddingVertical: 5 },
    mhpHi: { backgroundColor: 'rgba(107,143,94,0.16)', borderWidth: 1, borderColor: 'rgba(107,143,94,0.35)' },
    mhpLo: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border2 },
    mhpTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    mhpTxtHi: { color: colors.sage },
    mhpTxtLo: { color: colors.txt2 },

    dnaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    dnaLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: colors.txt2, width: 64, flexShrink: 0 },
    dnaTrack: { flex: 1, height: 3, backgroundColor: colors.border2, borderRadius: 1, overflow: 'hidden' },
    dnaFill: { height: '100%', borderRadius: 1 },
    dnaVal: { fontSize: 9, fontWeight: '700', color: colors.txt3, width: 26, textAlign: 'right' },

    profPgrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12 },
    profPgc: { width: '47%', borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
    profPgcImg: { height: 62, position: 'relative', overflow: 'hidden' },
    profPgcN: { position: 'absolute', bottom: 5, left: 7, fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    profPgcBody: { paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.bg === '#0C0B09' ? 'rgba(14,13,11,0.96)' : 'rgba(242,237,230,0.95)' },
    profPgcVibe: { fontSize: 8, fontWeight: '700', letterSpacing: 1, color: colors.sage },
    profPgcMeta: { fontSize: 9, color: colors.txt3, marginTop: 1 },

    signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 24 },
    signOutBtn: { paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.txt, borderRadius: 4, backgroundColor: colors.glass },
    signOutTxt: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: colors.txt },
  });
}
