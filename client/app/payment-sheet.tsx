import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { PaymentInfoCard } from "../src/components/PaymentInfo";
import { PulseLoader } from "../src/components/PulseLoader";
import { useGenerationStore } from "../src/stores/useGenerationStore";
import { useWalletStore } from "../src/stores/useWalletStore";
import { usePayment } from "../src/hooks/usePayment";
import { AppError } from "../src/services/errors";
import { colors, spacing, typography } from "../src/theme";

export default function PaymentSheet() {
  const router = useRouter();
  const { paymentInfo, prompt } = useGenerationStore();
  const { isConfigured, address } = useWalletStore();
  const payment = usePayment();

  if (!paymentInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No payment info available.</Text>
      </View>
    );
  }

  const accept = paymentInfo.accepts[0];
  const amountLabel = accept
    ? `$${Number(accept.amount) / 1_000_000} USDC`
    : "Pay";

  const handlePay = () => {
    payment.mutate(prompt);
  };

  const appError =
    payment.error instanceof AppError ? payment.error : null;
  const errorMessage = appError
    ? appError.userMessage
    : payment.error instanceof Error
      ? payment.error.message
      : payment.error
        ? "Payment failed"
        : null;
  const canRetry = appError?.recoverable ?? false;

  return (
    <View style={styles.container}>
      <PaymentInfoCard info={paymentInfo} />

      {isConfigured && address && (
        <View style={styles.walletRow}>
          <View style={styles.dot} />
          <Text style={styles.walletText}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          {canRetry && (
            <TouchableOpacity onPress={handlePay}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isConfigured ? (
        <TouchableOpacity
          style={styles.setupButton}
          onPress={() => router.push("/wallet-setup")}
          activeOpacity={0.8}
        >
          <Text style={styles.setupButtonText}>Set Up Wallet</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.payButton, payment.isPending && styles.buttonDisabled]}
          onPress={handlePay}
          disabled={payment.isPending}
          activeOpacity={0.8}
        >
          {payment.isPending ? (
            <View style={styles.loadingRow}>
              <PulseLoader size={7} color={colors.text} />
              <Text style={styles.payButtonText}>Signing & Paying...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>Pay {amountLabel}</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={payment.isPending}
      >
        <Text style={styles.cancelText}>Cancel</Text>
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
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  walletText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: "monospace",
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
    textAlign: "center",
  },
  retryText: {
    ...typography.label,
    color: colors.primaryLight,
  },
  setupButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  setupButtonText: {
    ...typography.subtitle,
    color: colors.primaryLight,
  },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    ...typography.subtitle,
    color: colors.text,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelText: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
