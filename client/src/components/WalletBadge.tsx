import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useWalletStore } from "../stores/useWalletStore";
import { colors, spacing, typography } from "../theme";

export function WalletBadge() {
  const router = useRouter();
  const { address, isConfigured } = useWalletStore();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push("/wallet-setup")}
      activeOpacity={0.7}
    >
      <View
        style={[styles.dot, isConfigured ? styles.dotActive : styles.dotInactive]}
      />
      <Text style={styles.text}>
        {isConfigured
          ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
          : "Set Up Wallet"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.success,
  },
  dotInactive: {
    backgroundColor: colors.textMuted,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
});
