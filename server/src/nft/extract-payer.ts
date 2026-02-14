import { Request } from "express";

/**
 * Extract the payer's wallet address from the x402 payment-signature header.
 * The header contains a base64-encoded JSON with payment authorization details.
 */
export function extractPayerAddress(req: Request): string | null {
  const header = (req.headers["payment-signature"] || req.headers["x-payment"]) as string;
  if (!header) return null;

  try {
    const decoded = JSON.parse(Buffer.from(header, "base64").toString());
    const payload = decoded?.payload;
    if (!payload) return null;

    // EIP-3009 TransferWithAuthorization
    const from =
      payload?.authorization?.from ||
      payload?.permit2Authorization?.from ||
      payload?.from ||
      null;

    return from;
  } catch {
    console.error("[nft] Failed to decode payment-signature header");
    return null;
  }
}
