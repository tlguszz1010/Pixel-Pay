import { create } from "zustand";
import {
  savePrivateKey,
  saveMnemonic,
  deletePrivateKey,
  getWalletAddress,
} from "../services/wallet";

interface WalletState {
  address: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;

  /** 앱 시작 시 SecureStore 확인 */
  initialize: () => Promise<void>;
  /** 프라이빗 키 저장 + 주소 업데이트 */
  importKey: (key: string) => Promise<void>;
  /** 니모닉 저장 + 주소 업데이트 */
  importMnemonic: (phrase: string) => Promise<void>;
  /** 키 삭제 */
  removeKey: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConfigured: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const address = await getWalletAddress();
      set({
        address,
        isConfigured: !!address,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  importKey: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const address = await savePrivateKey(key);
      set({
        address,
        isConfigured: true,
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to import key",
        isLoading: false,
      });
    }
  },

  importMnemonic: async (phrase: string) => {
    set({ isLoading: true, error: null });
    try {
      const address = await saveMnemonic(phrase);
      set({
        address,
        isConfigured: true,
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to import mnemonic",
        isLoading: false,
      });
    }
  },

  removeKey: async () => {
    set({ isLoading: true, error: null });
    try {
      await deletePrivateKey();
      set({
        address: null,
        isConfigured: false,
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to remove key",
        isLoading: false,
      });
    }
  },
}));
