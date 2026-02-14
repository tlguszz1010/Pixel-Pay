import { TextStyle } from "react-native";

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  } as TextStyle,
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
  } as TextStyle,
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: "400",
  } as TextStyle,
  label: {
    fontSize: 14,
    fontWeight: "500",
  } as TextStyle,
} as const;
