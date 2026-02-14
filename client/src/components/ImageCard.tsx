import { useState } from "react";
import { Image, StyleSheet, View, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { PulseLoader } from "./PulseLoader";
import { colors, spacing, typography } from "../theme";

interface Props {
  imageUrl: string;
  prompt: string;
}

export function ImageCard({ imageUrl, prompt }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
        />
        {loading && (
          <View style={styles.overlay}>
            <PulseLoader size={10} color={colors.primaryLight} />
          </View>
        )}
        {error && (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>Failed to load image</Text>
          </View>
        )}
        {!loading && !error && (
          <Animated.View
            style={StyleSheet.absoluteFill}
            entering={FadeIn.duration(300)}
            pointerEvents="none"
          />
        )}
      </View>
      <Text style={styles.prompt} numberOfLines={2}>
        {prompt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  imageWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  errorText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  prompt: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
});
