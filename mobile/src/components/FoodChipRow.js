import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fonts, radius } from '../constants/theme';

export default function FoodChipRow({ categories, selected, onSelect, colors }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {categories.map((item) => {
        const isOn = selected?.id === item.id;
        return (
          <Pressable
            key={item.id}
            style={[
              styles.chip,
              { borderColor: isOn ? colors.sage : colors.border2 },
              isOn && { backgroundColor: colors.sage },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(isOn ? null : item);
            }}
          >
            <Text style={styles.chipEmoji}>{item.emoji}</Text>
            <Text style={[styles.chipTxt, { color: isOn ? '#fff' : colors.txt2 }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 6, alignItems: 'center', paddingVertical: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 3, borderWidth: 1,
  },
  chipEmoji: { fontSize: 12 },
  chipTxt: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1 },
});
