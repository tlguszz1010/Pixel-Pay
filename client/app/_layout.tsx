import "../src/polyfills";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { colors } from "../src/theme";
import { useWalletStore } from "../src/stores/useWalletStore";

const queryClient = new QueryClient();

export default function RootLayout() {
  const initialize = useWalletStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "PixelPay" }}
        />
        <Stack.Screen
          name="result"
          options={{ title: "Result" }}
        />
        <Stack.Screen
          name="payment-sheet"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: [0.45, 0.7],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="wallet-setup"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: [0.5],
            sheetGrabberVisible: true,
            headerShown: false,
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
