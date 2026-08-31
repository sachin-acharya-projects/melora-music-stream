import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

type ToastFn = (message: string) => void;
let showToast: ToastFn = () => {};

export function toast(message: string) {
  showToast(message);
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    showToast = (msg: string) => {
      setMessage(msg);
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(2600),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMessage(null));
    };
    return () => {
      showToast = () => {};
    };
  }, [opacity]);

  if (!message) return null;
  return (
    <Animated.View style={[styles.wrap, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(14,16,22,0.92)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  text: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
});
