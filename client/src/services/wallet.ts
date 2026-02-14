import * as SecureStore from "expo-secure-store";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";

const SECURE_KEY = "pixelpay_private_key";

/** 0x 접두사 포함/미포함 모두 허용하는 64 hex 검증 */
export function isValidPrivateKey(key: string): boolean {
  const stripped = key.startsWith("0x") ? key.slice(2) : key;
  return /^[0-9a-fA-F]{64}$/.test(stripped);
}

/** 니모닉 검증 (12 또는 24 단어) */
export function isValidMnemonic(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}

/** 0x 접두사를 보장 */
function normalize(key: string): `0x${string}` {
  return key.startsWith("0x") ? (key as `0x${string}`) : `0x${key}`;
}

/** 프라이빗 키 저장 + 주소 반환 */
export async function savePrivateKey(key: string): Promise<string> {
  if (!isValidPrivateKey(key)) {
    throw new Error("Invalid private key format");
  }
  const normalized = normalize(key);
  await SecureStore.setItemAsync(SECURE_KEY, normalized);
  const account = privateKeyToAccount(normalized);
  return account.address;
}

/** 니모닉에서 프라이빗 키 추출 → 저장 + 주소 반환 */
export async function saveMnemonic(phrase: string): Promise<string> {
  if (!isValidMnemonic(phrase)) {
    throw new Error("Invalid mnemonic (12 or 24 words required)");
  }
  const account = mnemonicToAccount(phrase.trim());
  // account에서 프라이빗 키를 추출할 수 없으므로 니모닉 자체를 저장하고
  // getPrivateKey에서 니모닉도 처리하도록 함
  await SecureStore.setItemAsync(SECURE_KEY, phrase.trim());
  return account.address;
}

/** 저장된 값이 니모닉인지 확인 */
function isMnemonicStored(value: string): boolean {
  return value.includes(" ");
}

/** SecureStore에서 읽기 → viem account 반환 */
export async function getAccount() {
  const stored = await SecureStore.getItemAsync(SECURE_KEY);
  if (!stored) return null;
  if (isMnemonicStored(stored)) {
    return mnemonicToAccount(stored);
  }
  return privateKeyToAccount(stored as `0x${string}`);
}

/** 키 삭제 */
export async function deletePrivateKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_KEY);
}

/** 저장된 키/니모닉에서 주소 파생 (없으면 null) */
export async function getWalletAddress(): Promise<string | null> {
  const account = await getAccount();
  return account?.address ?? null;
}
