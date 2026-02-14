// ── 서버 응답 타입 ──────────────────────────────────

export interface GenerateResponse {
  prompt: string;
  imageUrl: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}

// ── x402 결제 정보 (PAYMENT-REQUIRED 헤더 base64 디코딩 결과) ──

export interface PaymentAccept {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: { name?: string; version?: string };
}

export interface PaymentResource {
  url: string;
  description: string;
  mimeType: string;
}

export interface PaymentInfo {
  x402Version: number;
  error: string;
  resource: PaymentResource;
  accepts: PaymentAccept[];
}

// ── 402 커스텀 에러 ─────────────────────────────────

export class PaymentRequiredError extends Error {
  public paymentInfo: PaymentInfo;

  constructor(paymentInfo: PaymentInfo) {
    super("Payment Required");
    this.name = "PaymentRequiredError";
    this.paymentInfo = paymentInfo;
  }
}
