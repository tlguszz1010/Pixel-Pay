import { apiFetch } from "./api";
import { GenerateResponse } from "./types";
import { USE_MOCK_GENERATE } from "../constants/config";

/**
 * POST /generate (또는 /generate-mock) 호출
 *
 * - 실제 모드: 402 → PaymentRequiredError throw (Phase 2에서는 여기서 멈춤)
 * - Mock 모드: placeholder 이미지 즉시 반환 (DALL-E 크레딧 절약)
 */
export function generateImage(prompt: string): Promise<GenerateResponse> {
  const endpoint = USE_MOCK_GENERATE ? "/generate-mock" : "/generate";

  return apiFetch<GenerateResponse>(endpoint, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
