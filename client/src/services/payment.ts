import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { getAccount } from "./wallet";
import { API_BASE_URL } from "../constants/config";
import type { GenerateResponse } from "./types";
import { classifyError } from "./errors";

/**
 * 결제 서명 + 이미지 생성 요청 실행
 *
 * 1. SecureStore에서 account 생성 (프라이빗 키 또는 니모닉)
 * 2. ExactEvmScheme 생성
 * 3. wrapFetchWithPaymentFromConfig로 payFetch 생성
 * 4. payFetch가 402 → EIP-712 서명 → X-PAYMENT 첨부 → 재요청 자동 처리
 * 5. 200 응답을 GenerateResponse로 반환
 */
export async function executePaymentRequest(
  prompt: string
): Promise<GenerateResponse> {
  const account = await getAccount();
  if (!account) {
    throw new Error("Wallet not configured. Please import a key or mnemonic.");
  }

  const evmScheme = new ExactEvmScheme(account);

  const payFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: "eip155:10143", // Monad Testnet
        client: evmScheme,
      },
    ],
  });

  const url = `${API_BASE_URL}/generate`;

  try {
    const res = await payFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(
        (body as { error?: string }).error ?? `Payment failed (HTTP ${res.status})`
      );
    }

    return res.json() as Promise<GenerateResponse>;
  } catch (error) {
    throw classifyError(error);
  }
}
