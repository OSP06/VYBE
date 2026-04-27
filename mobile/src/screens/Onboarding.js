import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MoodChip from '../components/MoodChip';
import StatusRow from '../components/StatusRow';
import { MOODS } from '../constants/moods';
import { fonts, radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const LANDING_MOODS = MOODS.slice(0, 6);

const HOW_IT_WORKS = [
  { n: '1', emoji: '😌', title: 'Pick your mood', sub: 'No typing. Just feeling.' },
  { n: '2', emoji: '🧠', title: 'AI reads the vibe', sub: 'Mood → vibe vector → match' },
  { n: '3', emoji: '🏡', title: 'Discover places', sub: 'Cards curated for your feeling' },
];

export default function Onboarding({ navigation }) {
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState('landing');
  const [selectedMood, setSelectedMood] = useState(null);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (step === 'mood') {
    return (
      <View style={styles.moodScreen}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={{ flex: 1 }}>
          <StatusRow paddingTop={16} />

          <View style={styles.moodTop}>
            <Text style={styles.moodEyebrow}>SELECT YOUR VIBE</Text>
            <View style={styles.moodH1Wrap}>
              <Text style={styles.moodH1}>
                HOW YOU{'\n'}FEELIN'{'\n'}
                <Text style={styles.moodItalic}>today?</Text>
              </Text>
            </View>
            <Text style={styles.moodSub}>Pick a vibe — we'll handle the rest.</Text>
          </View>

          <ScrollView contentContainerStyle={styles.moodGrid} showsVerticalScrollIndicator={false}>
            {MOODS.map((mood) => (
              <View key={mood.id} style={styles.chipWrap}>
                <MoodChip mood={mood} selected={selectedMood?.id === mood.id} onPress={setSelectedMood} />
              </View>
            ))}
            <View style={{ height: 120 }} />
          </ScrollView>

          {selectedMood && (
            <View style={styles.moodFooter}>
              <View style={styles.selBar}>
                <Text style={styles.selLbl}>SELECTED</Text>
                <Text style={styles.selVal}>{selectedMood.label}</Text>
                <View style={styles.selDots}>
                  {MOODS.map((m) => (
                    <View
                      key={m.id}
                      style={[
                        styles.selDot,
                        m.id === selectedMood.id && { backgroundColor: selectedMood.dot, transform: [{ scale: 1.25 }] },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Pressable
                style={[styles.moodBtn, { backgroundColor: selectedMood.dot }]}
                onPress={() => navigation.navigate('Feed', { mood: selectedMood })}
              >
                <Text style={styles.moodBtnText}>FIND MY VYBE</Text>
                <Text style={styles.moodBtnArrow}>→</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <LinearGradient colors={[colors.bg, colors.bg2, colors.bg3]} style={styles.landing}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusRow paddingTop={16} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.landingScroll}>

          <View style={styles.lpLogoBar}>
            <Text style={styles.lpLogoLeft}>FEEL FIRST</Text>
          </View>

          <View style={styles.lpHeadlineWrap}>
            <Text style={styles.lpHeadline}>FEEL{'\n'}YOUR{'\n'}VIBE <Text style={styles.lpItalic}>first.</Text></Text>
          </View>

          <View style={styles.lpRuleRow}>
            <View style={styles.lpRule} />
            <Text style={styles.lpRuleTxt}>SCROLL TO DISCOVER</Text>
            <View style={styles.lpRule} />
          </View>
          <Text style={styles.lpScrollHint}>↓ SCROLL TO DISCOVER ↓</Text>

          <View style={styles.lpCtaRow}>
            <Pressable style={styles.lpCta} onPress={() => setStep('mood')}>
              <Text style={styles.lpCtaText}>HOW YOU FEELIN'?</Text>
              <Text style={styles.lpCtaArrow}>→</Text>
            </Pressable>
          </View>

          <View style={styles.lpSection}>
            <Text style={styles.lpNum}>01</Text>
            <View style={styles.lpSecHead}>
              <Text style={styles.lpSecLbl}>PICK A MOOD</Text>
              <View style={styles.lpSecLine} />
            </View>
            <View style={styles.moodStripGrid}>
              {LANDING_MOODS.map((m) => (
                <Pressable key={m.id} style={styles.msf} onPress={() => setStep('mood')}>
                  <View style={styles.msfTopLine} />
                  <Text style={styles.msfEm}>{m.emoji}</Text>
                  <View>
                    <Text style={styles.msfName}>{m.label}</Text>
                    <Text style={styles.msfDesc}>{m.tagline}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.lpSection, { marginTop: 14 }]}>
            <Text style={styles.lpNum}>02</Text>
            <View style={styles.lpSecHead}>
              <Text style={styles.lpSecLbl}>HOW IT WORKS</Text>
              <View style={styles.lpSecLine} />
            </View>
            <View style={styles.hiwList}>
              {HOW_IT_WORKS.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.hiwItem,
                    i === 0 && styles.hiwFirst,
                    i === HOW_IT_WORKS.length - 1 && styles.hiwLast,
                  ]}
                >
                  <Text style={styles.hiwN}>{item.n}</Text>
                  <Text style={styles.hiwEm}>{item.emoji}</Text>
                  <View>
                    <Text style={styles.hiwT}>{item.title}</Text>
                    <Text style={styles.hiwS}>{item.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.lpFinal}>
            <View style={styles.lpFinalTopLine} />
            <Text style={styles.lpPull}>
              YOUR NEXT PLACE IS A <Text style={{ color: colors.sage }}>FEELING</Text> AWAY.
            </Text>
            <View style={styles.lpPullDivider} />
            <Text style={styles.lpPullSub}>
              Discovering places by mood, not by search. No listings. No ratings rabbit holes. Just vibe.
            </Text>
            <Pressable style={styles.lpEnterBtn} onPress={() => setStep('mood')}>
              <Text style={styles.lpEnterText}>ENTER VYBE →</Text>
            </Pressable>
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    landing: { flex: 1 },
    landingScroll: { paddingTop: 8, paddingBottom: 20 },

    lpLogoBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 },
    lpLogoLeft: { fontFamily: fonts.display, fontSize: 9, letterSpacing: 3, color: colors.sage },
    lpLogoRight: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: colors.txt3 },

    lpHeadlineWrap: { paddingHorizontal: 14, marginTop: 4 },
    lpHeadline: { fontFamily: fonts.display, fontSize: 88, lineHeight: 86, color: colors.txt, letterSpacing: -1 },
    lpItalic: { fontFamily: fonts.mood, fontSize: 52, color: colors.sage },

    lpRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, marginTop: 10 },
    lpRule: { flex: 1, height: 1, backgroundColor: colors.border2 },
    lpRuleTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.txt3 },
    lpScrollHint: { textAlign: 'center', fontSize: 9, fontWeight: '700', letterSpacing: 3, color: colors.txt3, paddingHorizontal: 18, marginTop: 4 },

    lpCtaRow: { paddingHorizontal: 14, marginTop: 10 },
    lpCta: {
      backgroundColor: colors.txt, borderRadius: radius.button, paddingVertical: 15,
      paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    lpCtaText: { fontFamily: fonts.display, fontSize: 22, color: colors.bg, letterSpacing: 1 },
    lpCtaArrow: { fontFamily: fonts.display, fontSize: 18, color: colors.bg },

    lpSection: { paddingHorizontal: 14, marginTop: 16 },
    lpNum: { fontFamily: fonts.display, fontSize: 52, color: colors.ink, lineHeight: 52, marginBottom: -10, paddingLeft: 2 },
    lpSecHead: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border2, paddingTop: 8, marginBottom: 10 },
    lpSecLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.txt3 },
    lpSecLine: { flex: 1, height: 1, backgroundColor: colors.border2 },

    moodStripGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    msf: {
      width: '48%', backgroundColor: colors.glass,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 12,
      flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', position: 'relative',
    },
    msfTopLine: { position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
    msfEm: { fontSize: 18, flexShrink: 0 },
    msfName: { fontFamily: fonts.display, fontSize: 11, color: colors.txt, letterSpacing: 0.5 },
    msfDesc: { fontSize: 9, color: colors.txt2, marginTop: 1 },

    hiwList: {},
    hiwItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 9, paddingHorizontal: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border2,
      backgroundColor: colors.glass,
    },
    hiwFirst: { borderRadius: 4, borderTopWidth: 1, borderTopColor: colors.border, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    hiwLast: { borderBottomWidth: 1, borderBottomColor: colors.border, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
    hiwN: { fontFamily: fonts.display, fontSize: 28, color: colors.sage2, width: 26, flexShrink: 0 },
    hiwEm: { fontSize: 18, flexShrink: 0 },
    hiwT: { fontSize: 11, fontWeight: '700', color: colors.txt },
    hiwS: { fontSize: 10, color: colors.txt2 },

    lpFinal: {
      marginHorizontal: 12, marginTop: 14,
      borderWidth: 1, borderColor: colors.border2,
      borderRadius: radius.card, padding: 20,
      backgroundColor: colors.glass, overflow: 'hidden', position: 'relative',
    },
    lpFinalTopLine: { position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
    lpPull: { fontFamily: fonts.display, fontSize: 36, color: colors.txt, lineHeight: 36, letterSpacing: 0.5, marginBottom: 8 },
    lpPullDivider: { height: 1, backgroundColor: colors.border2, marginTop: 8 },
    lpPullSub: { fontSize: 11, color: colors.txt2, lineHeight: 18, marginTop: 8 },
    lpEnterBtn: { marginTop: 12, backgroundColor: colors.txt, borderRadius: radius.small, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
    lpEnterText: { fontFamily: fonts.display, fontSize: 13, color: colors.bg, letterSpacing: 2 },

    // Mood step
    moodScreen: { flex: 1, backgroundColor: colors.bg },
    moodTop: { paddingTop: 8 },
    moodEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: colors.sage, paddingHorizontal: 18, marginBottom: 2 },
    moodH1Wrap: { paddingHorizontal: 14, marginBottom: 0 },
    moodH1: { fontFamily: fonts.display, fontSize: 54, lineHeight: 54, color: colors.txt, letterSpacing: -0.5 },
    moodItalic: { fontFamily: fonts.mood, fontSize: 42, color: colors.sage },
    moodSub: { fontSize: 11, color: colors.txt2, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
    moodGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
    chipWrap: { width: '47%' },

    moodFooter: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 12, paddingBottom: 32, paddingTop: 8,
      backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border2,
    },
    selBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
      borderRadius: radius.card, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8,
    },
    selLbl: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.txt3 },
    selVal: { fontFamily: fonts.display, fontSize: 13, color: colors.txt, flex: 1 },
    selDots: { flexDirection: 'row', gap: 3 },
    selDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border2 },
    moodBtn: { borderRadius: radius.button, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
    moodBtnText: { fontFamily: fonts.display, fontSize: 24, color: '#fff', letterSpacing: 2 },
    moodBtnArrow: { fontFamily: fonts.display, fontSize: 20, color: '#fff' },
  });
}
