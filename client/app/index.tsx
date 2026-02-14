import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PromptInput } from "../src/components/PromptInput";
import { GenerateButton } from "../src/components/GenerateButton";
import { WalletBadge } from "../src/components/WalletBadge";
import { useGenerationStore } from "../src/stores/useGenerationStore";
import { useHistoryStore } from "../src/stores/useHistoryStore";
import { useGenerateImage } from "../src/hooks/useGenerateImage";
import { PaymentRequiredError } from "../src/services/types";
import { AppError } from "../src/services/errors";
import { colors, spacing, typography } from "../src/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { prompt, setPrompt, setCurrentResult } = useGenerationStore();
  const mutation = useGenerateImage();
  const { items: history } = useHistoryStore();

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
  };

  // 402는 onError에서 처리되므로, 일반 에러만 표시
  const appError =
    mutation.error && !(mutation.error instanceof PaymentRequiredError)
      ? mutation.error instanceof AppError
        ? mutation.error
        : null
      : null;

  const errorMessage =
    mutation.error && !(mutation.error instanceof PaymentRequiredError)
      ? appError?.userMessage ?? mutation.error.message
      : null;

  const canRetry = appError?.recoverable ?? false;

  const handleHistoryTap = (item: { prompt: string; imageUrl: string }) => {
    setCurrentResult({ prompt: item.prompt, imageUrl: item.imageUrl });
    router.push("/result");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.content}>
          <WalletBadge />
          <Text style={styles.heading}>Create with AI</Text>
          <Text style={styles.sub}>
            Describe an image and pay $0.001 USDC to generate it.
          </Text>

          <PromptInput
            value={prompt}
            onChangeText={setPrompt}
            editable={!mutation.isPending}
          />

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {canRetry && (
                <TouchableOpacity onPress={handleGenerate}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {history.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyLabel}>Recent</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.historyScroll}
              >
                {history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleHistoryTap(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.historyThumb}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <GenerateButton
          onPress={handleGenerate}
          loading={mutation.isPending}
          disabled={!prompt.trim()}
        />
      </KeyboardAvoidingView>
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
    justifyContent: "space-between",
  },
  content: {
    gap: spacing.md,
  },
  heading: {
    ...typography.title,
    color: colors.text,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderRadius: 10,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  retryText: {
    ...typography.label,
    color: colors.primaryLight,
  },
  historySection: {
    gap: spacing.sm,
  },
  historyLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  historyScroll: {
    gap: spacing.sm,
  },
  historyThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
});
