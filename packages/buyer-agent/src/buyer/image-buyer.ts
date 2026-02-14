import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import fs from "fs";
import path from "path";
import { getAccount } from "./wallet";

const SELLER_URL = process.env.SELLER_URL || "http://localhost:4001";
const MONAD_NETWORK = "eip155:10143";
const STORAGE_DIR = path.join(__dirname, "../../storage/purchases");

function getPayFetch() {
  const account = getAccount();
  const scheme = new ExactEvmScheme(account);
  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: MONAD_NETWORK, client: scheme }],
  });
}

export interface BuyResult {
  imageId: string;
  filename: string;
  paid: boolean;
}

/**
 * Buy an image from the seller via x402 payment.
 * Downloads and saves the purchased image.
 */
export async function buyImage(imageId: string): Promise<BuyResult> {
  const payFetch = getPayFetch();
  const buyUrl = `${SELLER_URL}/api/gallery/buy?id=${encodeURIComponent(imageId)}`;

  console.log(`[buyer] Purchasing image ${imageId}...`);
  let res: Response;
  try {
    res = await payFetch(buyUrl, { method: "GET" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[buyer] payFetch threw:`, msg);
    throw new Error(`Payment request failed: ${msg}`);
  }

  console.log(`[buyer] Response status: ${res.status}`);
  if (res.status === 402) {
    // Log the 402 details for debugging
    const paymentHeader = res.headers.get("payment-required");
    if (paymentHeader) {
      try {
        const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf-8"));
        console.error(`[buyer] 402 details:`, JSON.stringify(decoded, null, 2));
      } catch {
        console.error(`[buyer] 402 raw header:`, paymentHeader);
      }
    }
    const body = await res.text();
    console.error(`[buyer] 402 body:`, body);
    throw new Error("Payment failed — check wallet balance");
  }
  if (!res.ok) {
    const text = await res.text();
    console.error(`[buyer] Non-OK response (${res.status}):`, text);
    throw new Error(`Buy failed (${res.status}): ${text}`);
  }

  // Check content type to determine if we got an image or JSON
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("image/")) {
    // Direct image response — save to disk
    const ext = contentType.includes("png") ? "png" : "jpg";
    const filename = `${imageId}_${Date.now()}.${ext}`;
    const filePath = path.join(STORAGE_DIR, filename);

    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`[buyer] Image saved: ${filePath}`);
    return { imageId, filename, paid: true };
  }

  // JSON response with imageUrl
  const data = (await res.json()) as { imageUrl?: string };
  if (data.imageUrl) {
    const imgRes = await fetch(data.imageUrl);
    if (imgRes.ok) {
      const ext = "png";
      const filename = `${imageId}_${Date.now()}.${ext}`;
      const filePath = path.join(STORAGE_DIR, filename);

      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      console.log(`[buyer] Image saved: ${filePath}`);
      return { imageId, filename, paid: true };
    }
  }

  return { imageId, filename: "", paid: true };
}
