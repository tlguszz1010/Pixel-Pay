import { fetchGallery, filterUnsold } from "./gallery-client";
import { evaluateAndPick } from "./evaluator";
import { buyImage } from "./image-buyer";
import { addPurchase, addLog } from "../db/queries";
import { isWalletConfigured } from "./wallet";

export interface PipelineResult {
  checked: number;
  unsold: number;
  purchased: string | null;
}

/**
 * Autonomous buying pipeline:
 * 1. Fetch gallery listing from seller
 * 2. Filter unsold images
 * 3. Evaluate and pick one to buy
 * 4. Execute x402 payment + download
 * 5. Record purchase in DB
 */
export async function runPipeline(): Promise<PipelineResult> {
  // Check wallet is configured
  if (!isWalletConfigured()) {
    addLog("error", "Pipeline skipped — wallet not configured");
    throw new Error("Wallet not configured. Set up wallet first via POST /api/wallet");
  }

  // 1. Fetch gallery
  console.log("[pipeline] Fetching gallery...");
  addLog("pipeline", "Fetching gallery listing");
  let gallery;
  try {
    gallery = await fetchGallery();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    addLog("error", `Failed to fetch gallery: ${msg}`);
    throw e;
  }
  console.log(`[pipeline] Found ${gallery.length} items in gallery`);

  // 2. Filter unsold
  const unsold = filterUnsold(gallery);
  console.log(`[pipeline] ${unsold.length} unsold items available`);
  addLog("pipeline", `Gallery: ${gallery.length} total, ${unsold.length} unsold`);

  if (unsold.length === 0) {
    addLog("pipeline", "No unsold images available — skipping");
    return { checked: gallery.length, unsold: 0, purchased: null };
  }

  // 3. Evaluate and pick
  const picked = await evaluateAndPick(unsold);
  if (!picked) {
    addLog("pipeline", "Evaluator returned no pick — skipping");
    return { checked: gallery.length, unsold: unsold.length, purchased: null };
  }
  console.log(`[pipeline] Picked image: ${picked.id} — "${picked.prompt}"`);
  addLog("pipeline", `Selected: "${picked.prompt}"`, { imageId: picked.id });

  // 4. Buy via x402
  try {
    const result = await buyImage(picked.id);

    // 5. Record purchase
    addPurchase({
      image_id: picked.id,
      prompt: picked.prompt,
      price: picked.price || "0.001",
      filename: result.filename,
    });
    addLog("purchase", `Bought: "${picked.prompt}"`, {
      imageId: picked.id,
      filename: result.filename,
    });

    console.log(`[pipeline] Purchase complete: ${picked.id}`);
    return {
      checked: gallery.length,
      unsold: unsold.length,
      purchased: picked.id,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    addLog("error", `Purchase failed: ${msg}`, { imageId: picked.id });
    throw e;
  }
}
