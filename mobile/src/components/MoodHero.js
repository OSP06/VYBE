import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const MOOD_CONFIGS = {
  calm: [
    { size: 200, color: 'rgba(107,143,94,0.20)', dur: 8000, left: '38%', top: '18%', fy: 18, fx: 8,  delay: 0,    sr: 0.06 },
    { size: 130, color: 'rgba(163,177,138,0.16)', dur: 11000, left: '5%', top: '44%', fy: 14, fx: -6, delay: 1200, sr: 0.04 },
    { size: 80,  color: 'rgba(200,221,208,0.26)', dur: 6500,  left: '62%', top: '5%', fy: 10, fx: 5,  delay: 600,  sr: 0.08 },
  ],
  aesthetic: [
    { size: 210, color: 'rgba(176,154,192,0.24)', dur: 9000,  left: '40%', top: '12%', fy: 18, fx: -10, delay: 0,   sr: 0.05 },
    { size: 140, color: 'rgba(224,208,236,0.20)', dur: 7000,  left: '3%',  top: '46%', fy: 12, fx: 8,   delay: 800, sr: 0.06 },
    { size: 90,  color: 'rgba(255,240,255,0.22)', dur: 5500,  left: '65%', top: '52%', fy: 8,  fx: -4,  delay: 400, sr: 0.08 },
  ],
  energetic: [
    { size: 160, color: 'rgba(212,131,74,0.22)',  dur: 3800,  left: '45%', top: '16%', fy: 28, fx: 12,  delay: 0,   sr: 0.10 },
    { size: 100, color: 'rgba(240,200,160,0.26)', dur: 3000,  left: '5%',  top: '36%', fy: 22, fx: -10, delay: 500, sr: 0.12 },
    { size: 70,  color: 'rgba(255,180,120,0.28)', dur: 2500,  left: '68%', top: '48%', fy: 18, fx: 8,   delay: 300, sr: 0.14 },
  ],
  social: [
    { size: 190, color: 'rgba(201,166,107,0.20)', dur: 6500,  left: '32%', top: '20%', fy: 16, fx: 8,  delay: 0,    sr: 0.05 },
    { size: 120, color: 'rgba(240,224,192,0.18)', dur: 8500,  left: '3%',  top: '48%', fy: 12, fx: -6, delay: 1000, sr: 0.04 },
    { size: 85,  color: 'rgba(232,212,168,0.24)', dur: 5000,  left: '65%', top: '6%',  fy: 10, fx: 5,  delay: 400,  sr: 0.07 },
  ],
  focus: [
    { size: 180, color: 'rgba(122,154,176,0.18)', dur: 12000, left: '38%', top: '18%', fy: 10, fx: 5,  delay: 0,    sr: 0.03 },
    { size: 110, color: 'rgba(200,216,232,0.16)', dur: 9500,  left: '5%',  top: '46%', fy: 8,  fx: -4, delay: 2000, sr: 0.02 },
    { size: 60,  color: 'rgba(220,235,245,0.20)', dur: 15000, left: '70%', top: '56%', fy: 6,  fx: 3,  delay: 1000, sr: 0.02 },
  ],
  romantic: [
    { size: 220, color: 'rgba(192,122,138,0.20)', dur: 10000, left: '35%', top: '12%', fy: 18, fx: -8, delay: 0,    sr: 0.05 },
    { size: 140, color: 'rgba(240,208,216,0.18)', dur: 7500,  left: '3%',  top: '48%', fy: 14, fx: 7,  delay: 1500, sr: 0.06 },
    { size: 90,  color: 'rgba(255,220,228,0.24)', dur: 6000,  left: '65%', top: '56%', fy: 10, fx: -5, delay: 600,  sr: 0.07 },
  ],
  explore: [
    { size: 170, color: 'rgba(106,170,152,0.20)', dur: 5500,  left: '40%', top: '15%', fy: 22, fx: 10, delay: 0,   sr: 0.07 },
    { size: 110, color: 'rgba(200,224,216,0.18)', dur: 7000,  left: '3%',  top: '48%', fy: 16, fx: -8, delay: 700, sr: 0.06 },
    { size: 80,  color: 'rgba(160,168,104,0.22)', dur: 4500,  left: '65%', top: '53%', fy: 14, fx: 6,  delay: 350, sr: 0.08 },
  ],
  budget_chill: [
    { size: 180, color: 'rgba(160,168,104,0.18)', dur: 9500,  left: '38%', top: '20%', fy: 14, fx: 6,  delay: 0,    sr: 0.04 },
    { size: 110, color: 'rgba(216,220,192,0.16)', dur: 11500, left: '5%',  top: '48%', fy: 10, fx: -5, delay: 1500, sr: 0.03 },
    { size: 75,  color: 'rgba(200,210,180,0.22)', dur: 7500,  left: '65%', top: '58%', fy: 8,  fx: 4,  delay: 700,  sr: 0.05 },
  ],
};

function AnimatedOrb({ orb }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const half = Math.floor(orb.dur / 2);
    const scaleHalf = Math.floor(orb.dur * 0.75);

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: half, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(floatAnim, { toValue: 0, duration: half, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    );
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1, duration: scaleHalf, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(scaleAnim, { toValue: 0, duration: scaleHalf, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    );

    if (orb.delay) {
      Animated.sequence([Animated.delay(orb.delay), floatLoop]).start();
      Animated.sequence([Animated.delay(Math.floor(orb.delay * 0.6)), scaleLoop]).start();
    } else {
      floatLoop.start();
      scaleLoop.start();
    }
  }, []);

  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -orb.fy] });
  const translateX = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, orb.fx] });
  const scale = scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + orb.sr] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: orb.left,
        top: orb.top,
        width: orb.size,
        height: orb.size,
        borderRadius: orb.size / 2,
        backgroundColor: orb.color,
        transform: [{ translateY }, { translateX }, { scale }],
      }}
    />
  );
}

export default function MoodHero({ moodId, gradColors, height = 260 }) {
  const { colors } = useTheme();
  const orbs = MOOD_CONFIGS[moodId] || MOOD_CONFIGS.calm;

  return (
    <View style={{ height, overflow: 'hidden', position: 'relative' }}>
      <LinearGradient
        colors={gradColors}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {orbs.map((orb, i) => (
        <AnimatedOrb key={i} orb={orb} />
      ))}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.5)' }}
      />
      <LinearGradient
        colors={['transparent', colors.bg]}
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
        locations={[0.2, 1]}
      />
    </View>
  );
}
