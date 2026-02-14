export type ErrorCode =
  | "INSUFFICIENT_BALANCE"
  | "PAYMENT_TIMEOUT"
  | "GENERATION_FAILED"
  | "NETWORK_ERROR"
  | "WALLET_NOT_CONFIGURED"
  | "UNKNOWN";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INSUFFICIENT_BALANCE: "Insufficient USDC balance.",
  PAYMENT_TIMEOUT: "Request timed out. Please try again.",
  GENERATION_FAILED: "Image generation failed. Please try again.",
  NETWORK_ERROR: "Network error. Check your connection.",
  WALLET_NOT_CONFIGURED: "Wallet not configured. Please import a key.",
  UNKNOWN: "Something went wrong. Please try again.",
};

const RECOVERABLE: Record<ErrorCode, boolean> = {
  INSUFFICIENT_BALANCE: false,
  PAYMENT_TIMEOUT: true,
  GENERATION_FAILED: true,
  NETWORK_ERROR: true,
  WALLET_NOT_CONFIGURED: false,
  UNKNOWN: true,
};

export class AppError extends Error {
  code: ErrorCode;
  recoverable: boolean;
  userMessage: string;

  constructor(code: ErrorCode, originalMessage?: string) {
    super(originalMessage ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.recoverable = RECOVERABLE[code];
    this.userMessage = ERROR_MESSAGES[code];
  }
}

export function classifyError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (msg.includes("insufficient") || msg.includes("balance")) {
    return new AppError("INSUFFICIENT_BALANCE", msg);
  }
  if (msg.includes("timeout") || msg.includes("abort")) {
    return new AppError("PAYMENT_TIMEOUT", msg);
  }
  if (msg.includes("generation failed") || msg.includes("generate")) {
    return new AppError("GENERATION_FAILED", msg);
  }
  if (msg.includes("wallet not configured") || msg.includes("import a key")) {
    return new AppError("WALLET_NOT_CONFIGURED", msg);
  }
  if (error instanceof TypeError || msg.includes("network") || msg.includes("fetch")) {
    return new AppError("NETWORK_ERROR", msg);
  }

  return new AppError("UNKNOWN", msg);
}
