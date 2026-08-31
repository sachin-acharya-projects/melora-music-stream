import { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Gradients, Radius, FontSize, Shadow } from '@/theme';

interface GradientButtonProps {
  title: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  style?: object;
  size?: 'md' | 'lg';
}

export function GradientButton({ title, icon, onPress, style, size = 'md' }: GradientButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, size === 'lg' && styles.btnLg, style]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={Gradients.brand}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={styles.row}>
        {icon ? <MaterialCommunityIcons name={icon} size={size === 'lg' ? 22 : 20} color={Colors.background} /> : null}
        <Text style={[styles.text, size === 'lg' && styles.textLg]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'relative',
    borderRadius: Radius.full,
    overflow: 'hidden',
    paddingVertical: 13,
    paddingHorizontal: 22,
    shadowColor: '#34E0A1',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  btnLg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: Colors.background,
    fontWeight: '800',
    fontSize: FontSize.md,
    letterSpacing: 0.2,
  },
  textLg: {
    fontSize: FontSize.lg,
  },
});
