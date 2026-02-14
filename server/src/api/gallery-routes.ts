import { Router, Request, Response } from "express";
import {
  getGallery,
  getImageById,
  markImageSold,
  addNft,
  getNftByImageId,
  addTokenDistribution,
  getTokenDistributionByImageId,
  addLog,
} from "../db/queries";
import { extractPayerAddress } from "../nft/extract-payer";
import { mintNFT } from "../nft/client";
import { transferPXPAY, isTokenDeployed } from "../token/client";

const router = Router();

// ── GET /api/gallery — list all images (free, no payment) ───
router.get("/", (_req: Request, res: Response) => {
  const images = getGallery();
  const result = images.map((img) => {
    const nft = img.sold === 1 ? getNftByImageId(img.id) : undefined;
    const tokenDist = img.sold === 1 ? getTokenDistributionByImageId(img.id) : undefined;
    return {
      id: img.id,
      prompt: img.prompt,
      imageUrl: img.image_url,
      previewUrl: img.image_url,
      price: img.price,
      sold: img.sold === 1,
      createdAt: img.created_at,
      nft: nft
        ? {
            tokenId: nft.token_id,
            owner: nft.owner,
            txHash: nft.tx_hash,
          }
        : null,
      tokenReward: tokenDist
        ? {
            amount: tokenDist.amount,
            txHash: tokenDist.tx_hash,
            token: "PXPAY",
            status: tokenDist.status,
          }
        : null,
    };
  });
  res.json(result);
});

// ── GET /api/gallery/buy?id=X — buy image (x402 protected) ──
// Note: This endpoint MUST be registered in the x402 routeConfig
// so it requires payment. The middleware handles 402 flow.
router.get("/buy", async (req: Request, res: Response) => {
  const id = req.query.id as string;
  if (!id) {
    res.status(400).json({ error: "id query parameter is required" });
    return;
  }

  const image = getImageById(id);
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  // Mark as sold (payment already verified by x402 middleware)
  markImageSold(id);

  // Extract payer address from x402 header and mint NFT
  const buyerAddress = extractPayerAddress(req);
  let nftResult: { tokenId: number; txHash: string } | null = null;

  if (buyerAddress) {
    try {
      const serverUrl =
        process.env.SERVER_URL || `http://localhost:${process.env.PORT || "4001"}`;
      const metadataUri = `${serverUrl}/api/nft/${0}`; // placeholder, updated after mint

      const result = await mintNFT(
        buyerAddress as `0x${string}`,
        metadataUri
      );

      const tokenId = Number(result.tokenId);
      const finalMetadataUri = `${serverUrl}/api/nft/${tokenId}`;

      addNft({
        tokenId,
        imageId: id,
        owner: buyerAddress,
        txHash: result.txHash,
        metadataUri: finalMetadataUri,
      });

      nftResult = { tokenId, txHash: result.txHash };

      addLog("nft-mint", `Minted NFT #${tokenId} to ${buyerAddress}`, {
        tokenId,
        txHash: result.txHash,
        imageId: id,
      });
    } catch (err) {
      console.error("[nft] Minting failed (purchase still valid):", err);
      addLog("nft-error", `NFT minting failed for image ${id}`, {
        error: err instanceof Error ? err.message : "Unknown error",
        buyer: buyerAddress,
      });
    }
  }

  // Transfer PXPAY reward token (if token is deployed)
  let tokenReward: { amount: string; txHash: string; token: string } | null =
    null;

  if (buyerAddress && isTokenDeployed()) {
    try {
      const result = await transferPXPAY(buyerAddress as `0x${string}`);

      if ("skipped" in result) {
        addTokenDistribution({
          buyerAddress,
          imageId: id,
          amount: "0",
          txHash: null,
          status: "skipped",
        });
        addLog("token-skip", result.reason, { buyer: buyerAddress });
      } else {
        tokenReward = {
          amount: result.amount,
          txHash: result.txHash,
          token: "PXPAY",
        };
        addTokenDistribution({
          buyerAddress,
          imageId: id,
          amount: result.amount,
          txHash: result.txHash,
          status: "success",
        });
        addLog(
          "token-reward",
          `Sent ${result.amount} PXPAY to ${buyerAddress}`,
          { txHash: result.txHash, imageId: id }
        );
      }
    } catch (err) {
      console.error("[token] Reward transfer failed (purchase still valid):", err);
      addTokenDistribution({
        buyerAddress,
        imageId: id,
        amount: "0",
        txHash: null,
        status: "failed",
      });
      addLog("token-error", `PXPAY reward failed for image ${id}`, {
        error: err instanceof Error ? err.message : "Unknown error",
        buyer: buyerAddress,
      });
    }
  }

  res.json({
    id: image.id,
    prompt: image.prompt,
    imageUrl: image.image_url,
    purchased: true,
    nft: nftResult
      ? {
          tokenId: nftResult.tokenId,
          txHash: nftResult.txHash,
          owner: buyerAddress,
        }
      : null,
    tokenReward,
  });
});

export default router;
