import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { generateImage } from "../services/generate";
import { useGenerationStore } from "../stores/useGenerationStore";
import { useHistoryStore } from "../stores/useHistoryStore";
import { PaymentRequiredError } from "../services/types";

/**
 * 이미지 생성 mutation
 *
 * 성공 → currentResult 저장 → /result 이동
 * 402  → paymentInfo 저장 → /payment-sheet 모달
 * 에러 → mutation.error로 UI 처리
 */
export function useGenerateImage() {
  const router = useRouter();
  const { setCurrentResult, setPaymentInfo } = useGenerationStore();

  return useMutation({
    mutationFn: (prompt: string) => generateImage(prompt),

    onSuccess: (data) => {
      setCurrentResult(data);
      useHistoryStore.getState().addItem(data.prompt, data.imageUrl);
      router.push("/result");
    },

    onError: (error) => {
      if (error instanceof PaymentRequiredError) {
        setPaymentInfo(error.paymentInfo);
        router.push("/payment-sheet");
      }
      // 다른 에러는 mutation.error로 화면에서 처리
    },
  });
}
