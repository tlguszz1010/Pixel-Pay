import { Platform } from "react-native";
import { API_BASE_URL } from "../constants/config";
import { PaymentRequiredError, PaymentInfo } from "./types";
import { classifyError, AppError } from "./errors";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * base64 디코딩 (React Native 환경)
 * - 웹: atob 사용
 * - 네이티브: 수동 디코딩
 */
function decodeBase64(encoded: string): string {
  if (typeof atob === "function") {
    return atob(encoded);
  }
  // React Native에서 atob 없을 경우 폴리필
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  const str = encoded.replace(/[^A-Za-z0-9+/=]/g, "");
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }
  return output;
}

/**
 * fetch 래퍼 — 402 응답을 PaymentRequiredError로 변환
 *
 * x402 서버가 402를 반환하면:
 *   - PAYMENT-REQUIRED 헤더에 base64 인코딩된 JSON이 들어옴
 *   - 이를 디코딩해서 PaymentRequiredError로 throw
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    // 402 Payment Required → PAYMENT-REQUIRED 헤더에서 결제 정보 추출
    if (res.status === 402) {
      const headerValue = res.headers.get("PAYMENT-REQUIRED") ?? "";
      let paymentInfo: PaymentInfo;
      try {
        const decoded = decodeBase64(headerValue);
        paymentInfo = JSON.parse(decoded);
      } catch {
        throw new Error("Failed to parse 402 payment info");
      }
      throw new PaymentRequiredError(paymentInfo);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof PaymentRequiredError) throw error;
    throw classifyError(error);
  } finally {
    clearTimeout(timer);
  }
}
