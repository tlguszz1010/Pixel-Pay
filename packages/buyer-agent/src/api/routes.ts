import { Router, Request, Response } from "express";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { createPublicClient, http, formatUnits, formatEther, defineChain } from "viem";
import {
  getSetting,
  setSetting,
  deleteSetting,
  getPurchases,
  getTotalSpent,
  getPurchaseCount,
  getLogs,
} from "../db/queries";
import { getWalletAddress, isWalletConfigured } from "../buyer/wallet";
import { runPipeline } from "../buyer/pipeline";

const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://monadscan.com" } },
});

const USDC_ADDRESS = "0x754704Bc059F8C67012fEd69BC8a327a5aafb603" as const;
const SELLER_URL = process.env.SELLER_URL || "http://localhost:4001";

const ERC20_ABI = [
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
] as const;

const balanceClient = createPublicClient({ chain: monadMainnet, transport: http() });

const router = Router();

// ── GET /api/status ─────────────────────────────────────
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    agent: "buyer",
    walletAddress: getWalletAddress(),
    walletConfigured: isWalletConfigured(),
    totalPurchases: getPurchaseCount(),
    totalSpent: getTotalSpent(),
  });
});

// ── GET /api/purchases ──────────────────────────────────
router.get("/purchases", (_req: Request, res: Response) => {
  res.json(getPurchases());
});

// ── GET /api/logs ───────────────────────────────────────
router.get("/logs", (_req: Request, res: Response) => {
  res.json(getLogs());
});

// ── GET /api/wallet ─────────────────────────────────────
router.get("/wallet", (_req: Request, res: Response) => {
  const address = getWalletAddress();
  if (!address) {
    res.json({ configured: false });
    return;
  }
  res.json({ configured: true, address });
});

// ── GET /api/wallet-info — balances ─────────────────────
router.get("/wallet-info", async (_req: Request, res: Response) => {
  const address = getWalletAddress();
  if (!address) {
    res.json({ configured: false });
    return;
  }

  try {
    const [monBalance, usdcBalance] = await Promise.all([
      balanceClient.getBalance({ address: address as `0x${string}` }),
      balanceClient.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address as `0x${string}`] }),
    ]);

    let pxpayBalance = "0";
    try {
      const tsRes = await fetch(`${SELLER_URL}/api/token-stats`);
      const tsData = await tsRes.json() as { deployed?: boolean; address?: string };
      if (tsData.deployed && tsData.address) {
        const pxpayAddr = tsData.address as `0x${string}`;
        const [raw, decimals] = await Promise.all([
          balanceClient.readContract({ address: pxpayAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [address as `0x${string}`] }),
          balanceClient.readContract({ address: pxpayAddr, abi: ERC20_ABI, functionName: "decimals" }),
        ]);
        pxpayBalance = formatUnits(raw, decimals);
      }
    } catch {}

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

// ── POST /api/wallet ────────────────────────────────────
router.post("/wallet", (req: Request, res: Response) => {
  const { privateKey, mnemonic } = req.body as {
    privateKey?: string;
    mnemonic?: string;
  };

  // Mnemonic takes priority
  if (mnemonic) {
    try {
      const account = mnemonicToAccount(mnemonic.trim());
      // Clear any existing privateKey, store mnemonic
      deleteSetting("privateKey");
      setSetting("mnemonic", mnemonic.trim());
      res.json({ success: true, address: account.address, type: "mnemonic" });
      return;
    } catch {
      res.status(400).json({ error: "Invalid mnemonic phrase" });
      return;
    }
  }

  if (privateKey) {
    try {
      const key = privateKey.startsWith("0x")
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`);
      const account = privateKeyToAccount(key);
      // Clear any existing mnemonic, store privateKey
      deleteSetting("mnemonic");
      setSetting("privateKey", key);
      res.json({ success: true, address: account.address, type: "privateKey" });
      return;
    } catch {
      res.status(400).json({ error: "Invalid private key" });
      return;
    }
  }

  res.status(400).json({ error: "privateKey or mnemonic is required" });
});

// ── DELETE /api/wallet ──────────────────────────────────
router.delete("/wallet", (_req: Request, res: Response) => {
  deleteSetting("privateKey");
  deleteSetting("mnemonic");
  res.json({ success: true });
});

// ── POST /api/trigger ───────────────────────────────────
router.post("/trigger", async (_req: Request, res: Response) => {
  try {
    const result = await runPipeline();
    res.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

export default router;
