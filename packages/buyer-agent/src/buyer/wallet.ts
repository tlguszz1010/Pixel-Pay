import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { getSetting } from "../db/queries";

/**
 * Resolve the viem account from stored wallet settings.
 * Supports both privateKey and mnemonic.
 */
export function getAccount() {
  // Check env vars first (for cloud deployment with ephemeral DB)
  const envKey = process.env.BUYER_PRIVATE_KEY;
  if (envKey) {
    return privateKeyToAccount(
      envKey.startsWith("0x") ? (envKey as `0x${string}`) : (`0x${envKey}` as `0x${string}`)
    );
  }

  const mnemonic = getSetting("mnemonic");
  if (mnemonic) {
    return mnemonicToAccount(mnemonic);
  }

  const privateKey = getSetting("privateKey");
  if (privateKey) {
    return privateKeyToAccount(
      privateKey.startsWith("0x")
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`)
    );
  }

  throw new Error("Wallet not configured");
}

export function isWalletConfigured(): boolean {
  return !!(process.env.BUYER_PRIVATE_KEY || getSetting("privateKey") || getSetting("mnemonic"));
}

export function getWalletAddress(): string | null {
  try {
    return getAccount().address;
  } catch {
    return null;
  }
}
