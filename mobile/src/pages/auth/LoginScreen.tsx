import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { Screen } from '@/components/ui/Screen';
import { BACKGROUNDS } from '@/config/backgrounds';
import { Colors, Spacing, Radius, FontSize } from '@/theme';

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  return (
    <Screen source={BACKGROUNDS.login} style={styles.container}>
      <LinearGradient
        colors={['rgba(10,10,12,0.55)', 'rgba(14,26,18,0.42)', 'rgba(10,10,12,0.55)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <MaterialCommunityIcons
          name="music-circle"
          size={88}
          color={Colors.primary}
        />
        <Text style={styles.title}>Melora</Text>
        <Text style={styles.tagline}>Your music, everywhere.</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => void login()}
        disabled={isLoading}
      >
        <MaterialCommunityIcons name="google" size={22} color={Colors.text} />
        <Text style={styles.buttonText}>
          {isLoading ? 'Please wait…' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.display,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  buttonText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
