import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { fonts } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

function getTime() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function StatusRow({ paddingTop = 10 }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [t, setT] = useState(getTime);

  useEffect(() => {
    const id = setInterval(() => setT(getTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  const borderCol = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(26,24,20,0.13)';
  const divCol    = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(26,24,20,0.09)';

  return (
    <View style={[s.row, { paddingTop }]}>
      <Text style={[s.logo, { color: colors.sage }]}>VYBE</Text>

      <View style={[s.toggleWrap, { borderColor: borderCol }]}>
        {/* LIGHT segment */}
        <Pressable
          style={[s.seg, !isDark && { backgroundColor: colors.sage }]}
          onPress={() => isDark && toggleTheme()}
          hitSlop={4}
        >
          <Text style={[s.segIco, { color: !isDark ? '#fff' : colors.txt3 }]}>✦</Text>
          <Text style={[s.segLbl, { color: !isDark ? '#fff' : colors.txt3 }]}>LIGHT</Text>
        </Pressable>

        <View style={[s.segDiv, { backgroundColor: divCol }]} />

        {/* DARK segment */}
        <Pressable
          style={[s.seg, isDark && { backgroundColor: colors.sage }]}
          onPress={() => !isDark && toggleTheme()}
          hitSlop={4}
        >
          <Text style={[s.segIco, { color: isDark ? '#fff' : colors.txt3 }]}>◐</Text>
          <Text style={[s.segLbl, { color: isDark ? '#fff' : colors.txt3 }]}>DARK</Text>
        </Pressable>
      </View>

      <Text style={[s.time, { color: colors.txt3 }]}>{t}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingBottom: 6,
  },
  logo: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, width: 52 },

  toggleWrap: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 4,
    overflow: 'hidden', alignItems: 'center',
  },
  seg: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
  },
  segIco: { fontSize: 13, lineHeight: 16 },
  segLbl: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1.5 },
  segDiv: { width: 1, alignSelf: 'stretch' },

  time: { fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 52, textAlign: 'right' },
});
