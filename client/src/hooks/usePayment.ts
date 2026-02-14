import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { executePaymentRequest } from "../services/payment";
import { useGenerationStore } from "../stores/useGenerationStore";
import { useHistoryStore } from "../stores/useHistoryStore";

/**
 * 결제 실행 mutation
 *
 * payment-sheet에서 "Pay" 버튼 탭 시 호출.
 * 성공 → currentResult 저장 → /result 이동
 * 실패 → mutation.error로 UI 처리
 */
export function usePayment() {
  const router = useRouter();
  const { setCurrentResult, setPaymentInfo } = useGenerationStore();

  return useMutation({
    mutationFn: (prompt: string) => executePaymentRequest(prompt),

    onSuccess: (data) => {
      setCurrentResult(data);
      setPaymentInfo(null);
      useHistoryStore.getState().addItem(data.prompt, data.imageUrl);
      router.replace("/result");
    },
  });
}
