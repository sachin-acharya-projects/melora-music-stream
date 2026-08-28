import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/theme';

export function AuroraBackground({ uri }: { uri?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { opacity: 0.42 }]}
          blurRadius={95}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : null}
      <LinearGradient
        colors={Gradients.aurora}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={Gradients.glow}
        style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background, opacity: 0.5 }]} />
    </View>
  );
}
