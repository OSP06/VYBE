import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  SafeAreaView, StatusBar, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import FadeImage from '../components/FadeImage';
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

const VIBE_LABELS = {
  calm: 'CALM', aesthetic: 'AESTHETIC', lively: 'LIVELY', social: 'SOCIAL',
  premium: 'PREMIUM', budget: 'BUDGET', work_friendly: 'WORK', date_friendly: 'DATE',
};

const VIBE_COLORS = {
  calm: '#6b8f5e', aesthetic: '#b09ac0', lively: '#e8a870',
  social: '#c0a890', premium: '#c8a84a', budget: '#a0b888',
  work_friendly: '#8aacb8', date_friendly: '#d4a0a8',
};

function computeDNA(saved) {
  if (!saved.length) return [];
  const totals = {};
  let count = 0;
  for (const p of saved) {
    if (p.vibe?.vibe_vector) {
      count++;
      for (const [k, v] of Object.entries(p.vibe.vibe_vector)) {
        totals[k] = (totals[k] || 0) + v;
      }
    }
  }
  if (!count) return [];
  return Object.entries(totals)
    .map(([k, v]) => ({ key: k, label: VIBE_LABELS[k] || k.toUpperCase(), pct: Math.round((v / count) * 100), color: VIBE_COLORS[k] || '#aaa' }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

function computeVibeTendencies(saved) {
  if (!saved.length) return [];
  const counts = {};
  for (const p of saved) {
    if (p.vibe?.vibe_vector) {
      const top = Object.entries(p.vibe.vibe_vector).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (top) counts[top] = (counts[top] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v], i) => ({ label: `${VIBE_LABELS[k] || k.toUpperCase()} × ${v}`, hi: i === 0 }));
}

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
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const { user, token, logout, updateUser } = useAuth();

  const openEdit = () => {
    setEditName(user?.display_name || '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try { await updateUser(editName.trim()); } catch {}
    setEditSaving(false);
    setEditOpen(false);
  };

  const { data: saved = [], isError: savedError, refetch: refetchSaved } = useQuery({
    queryKey: ['saved', user?.id],
    queryFn: () => fetchSaved(token),
    enabled: !!token,
  });

  const recentPlaces = saved.slice(0, 4);
  const dna = useMemo(() => computeDNA(saved), [saved]);
  const vibeTendencies = useMemo(() => computeVibeTendencies(saved), [saved]);
  const uniqueVibes = useMemo(() => new Set(saved.map(p => p.vibe?.vibe_vector ? Object.entries(p.vibe.vibe_vector).sort((a, b) => b[1] - a[1])[0]?.[0] : null).filter(Boolean)).size, [saved]);

  if (savedError) {
    return (
      <SafeAreaView style={[styles.container, styles.errorCenter]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text style={styles.errorTxt}>Couldn't load profile</Text>
        <Pressable style={styles.retryBtn} onPress={refetchSaved}>
          <Text style={styles.retryTxt}>TRY AGAIN</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StatusRow />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerBar}>
          <Text style={styles.headerLbl}>YOUR PROFILE</Text>
          <Pressable style={styles.editBtn} onPress={openEdit}>
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
            <View style={styles.profStatsRow}>
              <View style={styles.pst}>
                <Text style={styles.pstN}>{saved.length}</Text>
                <Text style={styles.pstL}>SAVED</Text>
              </View>
              <View style={[styles.pst, styles.pstMid]}>
                <Text style={styles.pstN}>{dna.length > 0 ? dna[0].pct + '%' : '—'}</Text>
                <Text style={styles.pstL}>TOP VIBE</Text>
              </View>
              <View style={styles.pst}>
                <Text style={styles.pstN}>{uniqueVibes}</Text>
                <Text style={styles.pstL}>VIBES</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.profSec}>
          <SecHeader num="01" label="VIBE TENDENCIES" styles={styles} />
          {vibeTendencies.length > 0 ? (
            <View style={styles.moodHistRow}>
              {vibeTendencies.map((m) => (
                <View key={m.label} style={[styles.mhp, m.hi ? styles.mhpHi : styles.mhpLo]}>
                  <Text style={[styles.mhpTxt, m.hi ? styles.mhpTxtHi : styles.mhpTxtLo]}>{m.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyHint}>Save places to see your vibe tendencies.</Text>
          )}
        </View>

        <View style={styles.profSec}>
          <SecHeader num="02" label="VIBE DNA" styles={styles} />
          {dna.length > 0 ? dna.map((bar) => (
            <View key={bar.key} style={styles.dnaRow}>
              <Text style={styles.dnaLbl}>{bar.label}</Text>
              <View style={styles.dnaTrack}>
                <View style={[styles.dnaFill, { width: `${bar.pct}%`, backgroundColor: bar.color }]} />
              </View>
              <Text style={styles.dnaVal}>{bar.pct}%</Text>
            </View>
          )) : (
            <Text style={styles.emptyHint}>Save places to build your Vibe DNA.</Text>
          )}
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
                    {place.image_url && (
                      <FadeImage source={{ uri: place.image_url }} style={StyleSheet.absoluteFill} />
                    )}
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)' }} />
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

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={styles.editOverlay} onPress={() => setEditOpen(false)}>
          <Pressable style={styles.editSheet} onPress={() => {}}>
            <View style={styles.editPill} />
            <Text style={styles.editTitle}>EDIT VYBE</Text>
            <Text style={styles.editLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.txt3}
              autoCapitalize="words"
              autoFocus
            />
            <Pressable style={styles.editSaveBtn} onPress={saveEdit} disabled={editSaving}>
              {editSaving
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.editSaveTxt}>SAVE →</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors, isDark) {
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
    profHeroInfo: { padding: 14, paddingTop: 12, paddingBottom: 13, backgroundColor: isDark ? 'rgba(12,11,9,0.95)' : 'rgba(242,237,230,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)' },
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
    dnaTrack: { flex: 1, height: 5, backgroundColor: colors.border2, borderRadius: 2, overflow: 'hidden' },
    dnaFill: { height: '100%', borderRadius: 2 },
    dnaVal: { fontSize: 9, fontWeight: '700', color: colors.txt3, width: 26, textAlign: 'right' },

    profPgrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12 },
    profPgc: { width: '47%', borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#A67C52', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 2 },
    profPgcImg: { height: 62, position: 'relative', overflow: 'hidden' },
    profPgcN: { position: 'absolute', bottom: 5, left: 7, fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    profPgcBody: { paddingHorizontal: 9, paddingVertical: 6, backgroundColor: isDark ? 'rgba(14,13,11,0.96)' : 'rgba(242,237,230,0.95)' },
    profPgcVibe: { fontSize: 8, fontWeight: '700', letterSpacing: 1, color: colors.sage },
    profPgcMeta: { fontSize: 9, color: colors.txt3, marginTop: 1 },

    emptyHint: { fontSize: 11, color: colors.txt3, fontStyle: 'italic', paddingBottom: 8 },
    errorCenter: { alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorTxt: { fontFamily: fonts.display, fontSize: 18, color: colors.txt, letterSpacing: 1 },
    retryBtn: { backgroundColor: colors.sage, borderRadius: 4, paddingHorizontal: 24, paddingVertical: 10 },
    retryTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#fff' },

    signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 24 },
    signOutBtn: { paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.txt, borderRadius: 4, backgroundColor: colors.glass },
    signOutTxt: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: colors.txt },

    editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    editSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 24, paddingTop: 14, borderTopWidth: 1, borderColor: colors.border2 },
    editPill: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border2, alignSelf: 'center', marginBottom: 18 },
    editTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.txt, letterSpacing: 1, marginBottom: 18 },
    editLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.txt3, marginBottom: 6 },
    editInput: { borderWidth: 1, borderColor: colors.border2, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.txt, backgroundColor: colors.glass, marginBottom: 16, fontFamily: fonts.body },
    editSaveBtn: { backgroundColor: colors.sage, borderRadius: radius.card, paddingVertical: 14, alignItems: 'center' },
    editSaveTxt: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: '#fff' },
  });
}
