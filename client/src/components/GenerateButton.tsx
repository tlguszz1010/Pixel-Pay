import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { PulseLoader } from "./PulseLoader";
import { colors, spacing, typography } from "../theme";

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function GenerateButton({ onPress, loading, disabled }: Props) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[styles.button, disabled && styles.disabled, animatedStyle]}
      >
        {loading ? (
          <PulseLoader size={8} color={colors.text} />
        ) : (
          <Animated.Text style={styles.label}>Generate — $0.001</Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.subtitle,
    color: colors.text,
  },
});
