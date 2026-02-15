import express from "express";
import cors from "cors";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import OpenAI from "openai";
import dotenv from "dotenv";
import galleryRoutes from "./api/gallery-routes";
import statusRoutes from "./api/status-routes";
import {
  addImage,
  addLog,
  getNftByTokenId,
  getImageById,
  getNftCount,
  getTotalTokensDistributed,
  getTokenDistributionCount,
} from "./db/queries";
import { getTokenInfo, isTokenDeployed, getBalanceOf } from "./token/client";
import { createPublicClient, http, formatUnits, formatEther } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./nft/client";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "4001", 10);

// ── OpenAI 설정 ─────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── x402 설정 ──────────────────────────────────────────
const payTo = process.env.PAY_TO || "0x0000000000000000000000000000000000000000";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402-facilitator.molandak.org",
});

const MONAD_NETWORK = "eip155:143";
const MONAD_USDC = "0x754704Bc059F8C67012fEd69BC8a327a5aafb603";

const monadScheme = new ExactEvmScheme();
monadScheme.registerMoneyParser(async (amount: number, network: string) => {
  if (network === MONAD_NETWORK) {
    return {
      amount: Math.floor(amount * 1_000_000).toString(),
      asset: MONAD_USDC,
      extra: { name: "USDC", version: "2" },
    };
  }
  return null;
});

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(MONAD_NETWORK, monadScheme);

// Route config — x402 protected endpoints
const routeConfig = {
  "POST /generate": {
    accepts: [
      { scheme: "exact", price: "$0.01", network: MONAD_NETWORK, payTo },
    ],
    description: "Generate an AI image from a text prompt",
  },
  "GET /api/gallery/buy": {
    accepts: [
      { scheme: "exact", price: "$0.01", network: MONAD_NETWORK, payTo },
    ],
    description: "Purchase a gallery image",
  },
};

// ── 미들웨어 ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(paymentMiddleware(routeConfig, resourceServer));

// ── Free routes ─────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: "PixelPay Seller Agent",
    description: "Autonomous AI art economy powered by x402 micropayments on Monad",
    endpoints: {
      "POST /generate": "$0.01 USDC — Generate AI image (x402)",
      "GET /api/gallery": "Free — Browse gallery",
      "GET /api/gallery/buy?id=X": "$0.01 USDC — Purchase image (x402)",
      "GET /api/status": "Free — Revenue stats",
      "GET /api/token-stats": "Free — $PXPAY token info",
      "GET /health": "Free — Health check",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", agent: "seller" });
});

app.use("/api/gallery", galleryRoutes);
app.use("/api/status", statusRoutes);

// ── NFT stats (for dashboard) ───────────────────────────
app.get("/api/nft-stats", (_req, res) => {
  res.json({ totalMinted: getNftCount() });
});

// ── Token stats (for dashboard) ─────────────────────────
app.get("/api/token-stats", async (_req, res) => {
  if (!isTokenDeployed()) {
    res.json({ deployed: false });
    return;
  }

  try {
    const info = await getTokenInfo();
    res.json({
      deployed: true,
      address: info.address,
      totalSupply: info.totalSupply,
      creatorBalance: info.creatorBalance,
      creatorPercent: info.creatorPercent,
      rewardPerPurchase: info.rewardPerPurchase,
      totalDistributed: getTotalTokensDistributed(),
      distributionCount: getTokenDistributionCount(),
    });
  } catch (err) {
    console.error("[token-stats] Error:", err);
    res.json({ deployed: false, error: "Failed to fetch token info" });
  }
});

// ── Seller wallet info (for dashboard) ──────────────────
const USDC_ADDRESS = MONAD_USDC as `0x${string}`;
const USDC_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

const balanceClient = createPublicClient({ chain: monadTestnet, transport: http() });

function getSellerAddress(): string {
  const mnemonic = process.env.SELLER_MNEMONIC;
  if (mnemonic) return mnemonicToAccount(mnemonic).address;
  const key = process.env.SELLER_PRIVATE_KEY;
  if (key) return privateKeyToAccount(key as `0x${string}`).address;
  return "";
}

app.get("/api/wallet-info", async (_req, res) => {
  const address = getSellerAddress();
  if (!address) {
    res.json({ configured: false });
    return;
  }

  try {
    const [monBalance, usdcBalance] = await Promise.all([
      balanceClient.getBalance({ address: address as `0x${string}` }),
      balanceClient.readContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "balanceOf", args: [address as `0x${string}`] }),
    ]);

    let pxpayBalance = "0";
    if (isTokenDeployed()) {
      try { pxpayBalance = await getBalanceOf(address as `0x${string}`); } catch {}
    }

    res.json({
      configured: true,
      address,
      mon: formatEther(monBalance),
      usdc: formatUnits(usdcBalance, 6),
      pxpay: pxpayBalance,
    });
  } catch (err) {
    res.json({ configured: true, address, error: "Failed to fetch balances" });
  }
});

// ── NFT metadata endpoint (ERC-721 tokenURI target) ────
app.get("/api/nft/:tokenId", (req, res) => {
  const tokenId = parseInt(req.params.tokenId, 10);
  if (isNaN(tokenId)) {
    res.status(400).json({ error: "Invalid tokenId" });
    return;
  }

  const nft = getNftByTokenId(tokenId);
  if (!nft) {
    res.status(404).json({ error: "NFT not found" });
    return;
  }

  const image = getImageById(nft.image_id);
  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.json({
    name: `PixelPay #${tokenId}`,
    description: "AI-generated image purchased via x402 agent-to-agent economy",
    image: image.image_url,
    external_url: `https://monadscan.com/tx/${nft.tx_hash}`,
    attributes: [
      { trait_type: "Prompt", value: image.prompt },
      { trait_type: "Price", value: `${image.price} USDC` },
      { trait_type: "Image ID", value: image.id },
    ],
  });
});

// ── Mock generate (dev only) ────────────────────────────
app.post("/generate-mock", (req, res) => {
  const { prompt } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt is required" }); return; }
  const seed = Math.floor(Math.random() * 1000);
  const imageUrl = `https://picsum.photos/seed/${seed}/1024/1024`;

  // Save to gallery DB
  const id = addImage({ prompt, imageUrl });
  addLog("generate", `Mock generated: "${prompt}"`, { id, imageUrl });

  res.json({ prompt, imageUrl, id });
});

// ── Image generation (x402 protected) ───────────────────
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      res.status(500).json({ error: "Image generation failed" });
      return;
    }

    // Save to gallery DB
    const id = addImage({ prompt, imageUrl });
    addLog("generate", `Generated: "${prompt}"`, { id, imageUrl });

    res.json({ prompt, imageUrl, id });
  } catch (error) {
    console.error("DALL-E error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Image generation failed", detail: message });
  }
});

// ── Auto-generation prompts ─────────────────────────────
const AUTO_PROMPTS = [
  "pixel art cat sitting on a rainbow cloud",
  "neon cyberpunk street market at night",
  "abstract geometric waves in pastel colors",
  "retro 8-bit spaceship battle scene",
  "watercolor landscape of floating islands",
  "minimalist line art portrait of a fox",
  "vaporwave sunset over digital ocean",
  "isometric pixel art coffee shop interior",
  "glitch art portrait with neon distortion",
  "low-poly mountain scene at golden hour",
  "kawaii food characters having a party",
  "steampunk mechanical bird in flight",
  "synthwave grid with palm trees silhouette",
  "hand-drawn botanical illustration of alien plants",
  "pixel art medieval castle under northern lights",
];

function getRandomPrompt(): string {
  return AUTO_PROMPTS[Math.floor(Math.random() * AUTO_PROMPTS.length)];
}

function autoGenerate() {
  const prompt = getRandomPrompt();
  const seed = Math.floor(Math.random() * 10000);
  const imageUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
  const id = addImage({ prompt, imageUrl });
  addLog("auto-generate", `Auto generated: "${prompt}"`, { id });
  console.log(`[auto] Generated: "${prompt}" (${id})`);
}

app.listen(PORT, () => {
  console.log(`PixelPay Seller Agent running on http://localhost:${PORT}`);
  console.log(`  payTo: ${payTo}`);
  console.log(`  POST /generate       → $0.01 USDC (x402)`);
  console.log(`  POST /generate-mock  → free (mock image)`);
  console.log(`  GET  /api/gallery/buy → $0.01 USDC (x402)`);
  console.log(`  GET  /api/gallery     → free`);
  console.log(`  GET  /api/status      → free`);
  console.log(`  GET  /api/nft/:id     → free (NFT metadata)`);
  console.log(`  GET  /api/token-stats → free (PXPAY token stats)`);
  console.log(`  Mode: manual generation (POST /generate-mock or /generate)`);

  // Generate a few images on startup so gallery isn't empty
  console.log("[startup] Generating initial gallery images...");
  for (let i = 0; i < 3; i++) autoGenerate();
});
