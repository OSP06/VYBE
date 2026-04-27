import React, { useRef } from 'react';
import { Pressable, Text, View, StyleSheet, Animated } from 'react-native';
import { fonts, radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function MoodChip({ mood, selected, onPress }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        onPress={() => onPress(mood)}
        style={[
          s.card,
          { borderColor: colors.border, backgroundColor: colors.glass },
          selected && { backgroundColor: colors.glass2, shadowOpacity: 0.1, shadowRadius: 30 },
        ]}
      >
        <View style={[s.dot, { backgroundColor: mood.dot }]} />
        <Text style={s.emoji}>{mood.emoji}</Text>
        <Text style={[s.name, { color: colors.txt }]}>{mood.label}</Text>
        <Text style={[s.desc, { color: colors.txt2 }]}>{mood.tagline}</Text>
        {selected && (
          <View style={[s.check, { backgroundColor: colors.sage }]}>
            <Text style={s.checkText}>✓</Text>
          </View>
        )}
        <View style={s.topLine} />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 12,
    paddingBottom: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  topLine: {
    position: 'absolute', top: 0, left: '8%', right: '8%',
    height: 1, backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', top: 10, right: 10 },
  emoji: { fontSize: 20, marginBottom: 5 },
  name: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.5 },
  desc: { fontFamily: fonts.body, fontSize: 9, marginTop: 2 },
  check: {
    position: 'absolute', bottom: 8, right: 8,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { fontSize: 8, color: '#fff', fontWeight: '700' },
});
