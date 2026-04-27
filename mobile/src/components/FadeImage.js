import React, { useRef } from 'react';
import { Animated } from 'react-native';

export default function FadeImage({ source, style, resizeMode = 'cover', onError }) {
  const opacity = useRef(new Animated.Value(0)).current;
  return (
    <Animated.Image
      source={source}
      style={[style, { opacity }]}
      resizeMode={resizeMode}
      onLoad={() =>
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start()
      }
      onError={onError}
    />
  );
}
