import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useWalletStore } from "../src/stores/useWalletStore";
import { isValidPrivateKey, isValidMnemonic } from "../src/services/wallet";
import { colors, spacing, typography } from "../src/theme";

type Mode = "mnemonic" | "privateKey";

export default function WalletSetupScreen() {
  const router = useRouter();
  const {
    address,
    isConfigured,
    isLoading,
    error,
    importKey,
    importMnemonic,
    removeKey,
  } = useWalletStore();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("mnemonic");

  const handleImport = async () => {
    if (mode === "mnemonic") {
      if (!isValidMnemonic(input)) {
        Alert.alert("Invalid Mnemonic", "Please enter a 12 or 24 word seed phrase.");
        return;
      }
      await importMnemonic(input);
    } else {
      if (!isValidPrivateKey(input)) {
        Alert.alert("Invalid Key", "Please enter a valid 64-character hex private key.");
        return;
      }
      await importKey(input);
    }
    setInput("");
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove Wallet",
      "Are you sure you want to remove your wallet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeKey(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Setup</Text>
      <Text style={styles.warning}>
        Testnet only — never use a mainnet key here.
      </Text>

      {isConfigured ? (
        <View style={styles.configuredBox}>
          <View style={styles.addressRow}>
            <View style={styles.dot} />
            <Text style={styles.addressText}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </Text>
          </View>
          <Text style={styles.statusText}>Wallet connected</Text>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            disabled={isLoading}
          >
            <Text style={styles.removeText}>Remove Wallet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputBox}>
          {/* 모드 토글 */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === "mnemonic" && styles.tabActive]}
              onPress={() => { setMode("mnemonic"); setInput(""); }}
            >
              <Text
                style={[styles.tabText, mode === "mnemonic" && styles.tabTextActive]}
              >
                Seed Phrase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === "privateKey" && styles.tabActive]}
              onPress={() => { setMode("privateKey"); setInput(""); }}
            >
              <Text
                style={[styles.tabText, mode === "privateKey" && styles.tabTextActive]}
              >
                Private Key
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, mode === "mnemonic" && styles.inputMultiline]}
            value={input}
            onChangeText={setInput}
            placeholder={
              mode === "mnemonic"
                ? "Enter 12 or 24 word seed phrase..."
                : "Enter private key (0x...)"
            }
            placeholderTextColor={colors.textMuted}
            secureTextEntry={mode === "privateKey"}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={mode === "mnemonic"}
            numberOfLines={mode === "mnemonic" ? 3 : 1}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.importButton,
              !input.trim() && styles.buttonDisabled,
            ]}
            onPress={handleImport}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.importText}>
                {mode === "mnemonic" ? "Import Seed Phrase" : "Import Key"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: "center",
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  warning: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  configuredBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  addressText: {
    ...typography.subtitle,
    color: colors.text,
    fontFamily: "monospace",
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  removeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  removeText: {
    ...typography.label,
    color: colors.error,
  },
  inputBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.label,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
  },
  importButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  importText: {
    ...typography.subtitle,
    color: colors.text,
  },
  doneButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneText: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
