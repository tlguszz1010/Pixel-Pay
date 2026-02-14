import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import { File, Paths } from "expo-file-system";
import Animated, { FadeIn } from "react-native-reanimated";
import { ImageCard } from "../src/components/ImageCard";
import { useGenerationStore } from "../src/stores/useGenerationStore";
import { colors, spacing, typography } from "../src/theme";

type SaveState = "idle" | "saving" | "saved";

export default function ResultScreen() {
  const router = useRouter();
  const { currentResult, reset } = useGenerationStore();
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const handleNewGeneration = () => {
    reset();
    router.back();
  };

  const handleSave = async () => {
    if (!currentResult) return;
    setSaveState("saving");

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to save photos.");
        setSaveState("idle");
        return;
      }

      const dest = new File(Paths.cache, `pixelpay_${Date.now()}.png`);
      const downloaded = await File.downloadFileAsync(currentResult.imageUrl, dest);
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);

      setSaveState("saved");
    } catch {
      Alert.alert("Save failed", "Could not save image to photos.");
      setSaveState("idle");
    }
  };

  if (!currentResult) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No image generated yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : "Save to Photos";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Animated.View style={styles.inner} entering={FadeIn.duration(400)}>
        <ImageCard
          imageUrl={currentResult.imageUrl}
          prompt={currentResult.prompt}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              saveState === "saved" && styles.saveButtonDone,
            ]}
            onPress={handleSave}
            disabled={saveState !== "idle"}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.saveButtonText,
                saveState === "saved" && styles.saveButtonTextDone,
              ]}
            >
              {saveLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleNewGeneration}>
            <Text style={styles.buttonText}>Generate Another</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonDone: {
    backgroundColor: colors.success,
  },
  saveButtonText: {
    ...typography.subtitle,
    color: colors.text,
  },
  saveButtonTextDone: {
    color: colors.bg,
  },
  button: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: {
    ...typography.subtitle,
    color: colors.text,
  },
});
