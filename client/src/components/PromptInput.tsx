import { TextInput, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../theme";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
}

export function PromptInput({ value, onChangeText, editable = true }: Props) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Describe the image you want…"
      placeholderTextColor={colors.textMuted}
      multiline
      numberOfLines={3}
      textAlignVertical="top"
      editable={editable}
      autoCapitalize="none"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 100,
  },
});
