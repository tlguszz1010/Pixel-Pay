import { create } from "zustand";
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV();
const STORAGE_KEY = "generation_history";
const MAX_ITEMS = 50;

export interface HistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: number;
}

interface HistoryState {
  items: HistoryItem[];
  addItem: (prompt: string, imageUrl: string) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
}

function loadItems(): HistoryItem[] {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

function persist(items: HistoryItem[]) {
  storage.set(STORAGE_KEY, JSON.stringify(items));
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: loadItems(),

  addItem: (prompt, imageUrl) => {
    const item: HistoryItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      prompt,
      imageUrl,
      createdAt: Date.now(),
    };
    const next = [item, ...get().items].slice(0, MAX_ITEMS);
    persist(next);
    set({ items: next });
  },

  removeItem: (id) => {
    const next = get().items.filter((i) => i.id !== id);
    persist(next);
    set({ items: next });
  },

  clearAll: () => {
    storage.remove(STORAGE_KEY);
    set({ items: [] });
  },
}));
