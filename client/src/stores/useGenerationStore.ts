import { create } from "zustand";
import { GenerateResponse, PaymentInfo } from "../services/types";

interface GenerationState {
  // 현재 프롬프트
  prompt: string;
  setPrompt: (prompt: string) => void;

  // 생성 결과
  currentResult: GenerateResponse | null;
  setCurrentResult: (result: GenerateResponse | null) => void;

  // 402 결제 정보
  paymentInfo: PaymentInfo | null;
  setPaymentInfo: (info: PaymentInfo | null) => void;

  // 초기화
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  prompt: "",
  setPrompt: (prompt) => set({ prompt }),

  currentResult: null,
  setCurrentResult: (currentResult) => set({ currentResult }),

  paymentInfo: null,
  setPaymentInfo: (paymentInfo) => set({ paymentInfo }),

  reset: () =>
    set({ prompt: "", currentResult: null, paymentInfo: null }),
}));
