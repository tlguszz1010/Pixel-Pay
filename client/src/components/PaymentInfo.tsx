import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../theme";
import type { PaymentInfo as PaymentInfoType } from "../services/types";

interface Props {
  info: PaymentInfoType;
}

// 네트워크 ID → 사람이 읽을 수 있는 이름
const NETWORK_NAMES: Record<string, string> = {
  "eip155:84532": "Base Sepolia (Testnet)",
  "eip155:8453": "Base",
  "eip155:1": "Ethereum",
};

export function PaymentInfoCard({ info }: Props) {
  const accept = info.accepts[0];
  if (!accept) return null;

  const networkName = NETWORK_NAMES[accept.network] ?? accept.network;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Required</Text>
      <Text style={styles.description}>{info.resource.description}</Text>

      <View style={styles.divider} />

      <Row label="Amount" value={`${Number(accept.amount) / 1_000_000} USDC`} />
      <Row label="Network" value={networkName} />
      <Row label="Token" value={accept.extra?.name ?? "USDC"} />
      <Row
        label="Pay to"
        value={`${accept.payTo.slice(0, 6)}…${accept.payTo.slice(-4)}`}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  rowValue: {
    ...typography.label,
    color: colors.text,
  },
});
