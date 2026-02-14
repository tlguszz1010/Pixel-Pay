import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { monadTestnet } from "../nft/client";
import { getSetting } from "../db/queries";

// ── ERC-20 ABI (minimal) ────────────────────────────────
const ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ── Clients ──────────────────────────────────────────────
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

function getSellerAccount() {
  const mnemonic = process.env.SELLER_MNEMONIC;
  if (mnemonic) return mnemonicToAccount(mnemonic);

  const key = process.env.SELLER_PRIVATE_KEY;
  if (key) return privateKeyToAccount(key as `0x${string}`);

  throw new Error("SELLER_MNEMONIC or SELLER_PRIVATE_KEY not set");
}

function getTokenAddress(): `0x${string}` {
  const addr = getSetting("pxpay_token_address");
  if (!addr)
    throw new Error("PXPAY token not deployed. Run token:deploy first.");
  return addr as `0x${string}`;
}

function getRewardAmount(): string {
  return getSetting("pxpay_reward_per_purchase") || "100";
}

// ── Transfer PXPAY (with 5% creator hold check) ─────────
export async function transferPXPAY(
  to: `0x${string}`,
  amount?: string
): Promise<{ txHash: string; amount: string } | { skipped: true; reason: string }> {
  const tokenAddress = getTokenAddress();
  const account = getSellerAccount();
  const rewardAmount = amount || getRewardAmount();

  // Get decimals
  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const parsedAmount = parseUnits(rewardAmount, decimals);

  // Safety check: ensure creator has enough balance to transfer
  // (nad.fun bonding curve means most supply is in the pool, not creator)
  const creatorBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  // Keep at least 5% of creator's OWN balance as reserve
  const minHold = (creatorBalance * BigInt(5)) / BigInt(100);
  const balanceAfter = creatorBalance - parsedAmount;

  if (balanceAfter < minHold) {
    const reason = `Insufficient creator balance (have: ${formatUnits(creatorBalance, decimals)}, need to keep: ${formatUnits(minHold, decimals)})`;
    console.log(`[token] Skipped: ${reason}`);
    return { skipped: true, reason };
  }

  // Transfer
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  const txHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, parsedAmount],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  console.log(`[token] Sent ${rewardAmount} PXPAY to ${to} | tx: ${txHash}`);
  return { txHash, amount: rewardAmount };
}

// ── Token Info ────────────────────────────────────────────
export async function getTokenInfo(): Promise<{
  address: string;
  totalSupply: string;
  creatorBalance: string;
  creatorPercent: number;
  rewardPerPurchase: string;
  decimals: number;
}> {
  const tokenAddress = getTokenAddress();
  const account = getSellerAccount();

  const [totalSupply, creatorBalance, decimals] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "totalSupply",
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ]);

  const creatorPercent =
    totalSupply > BigInt(0)
      ? Number((creatorBalance * BigInt(10000)) / totalSupply) / 100
      : 0;

  return {
    address: tokenAddress,
    totalSupply: formatUnits(totalSupply, decimals),
    creatorBalance: formatUnits(creatorBalance, decimals),
    creatorPercent,
    rewardPerPurchase: getRewardAmount(),
    decimals,
  };
}

// ── Balance check ────────────────────────────────────────
export async function getBalanceOf(address: `0x${string}`): Promise<string> {
  const tokenAddress = getTokenAddress();

  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  });

  return formatUnits(balance, decimals);
}

// ── Check if token is deployed ───────────────────────────
export function isTokenDeployed(): boolean {
  try {
    getTokenAddress();
    return true;
  } catch {
    return false;
  }
}
