import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  getContract,
} from "viem";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { getSetting } from "../db/queries";

// ── Monad Testnet chain definition ─────────────────────
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
});

// ── ABI (mint function + read functions) ───────────────
export const PIXELPAY_NFT_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" },
    ],
    name: "mint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
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
    inputs: [{ name: "o", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ── Clients ────────────────────────────────────────────
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

function getContractAddress(): `0x${string}` {
  const addr = getSetting("nft_contract_address");
  if (!addr) throw new Error("NFT contract not deployed. Run deploy.ts first.");
  return addr as `0x${string}`;
}

// ── Mint NFT ───────────────────────────────────────────
export async function mintNFT(
  to: `0x${string}`,
  metadataUri: string
): Promise<{ tokenId: bigint; txHash: string }> {
  const account = getSellerAccount();
  const contractAddress = getContractAddress();

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: PIXELPAY_NFT_ABI,
    functionName: "mint",
    args: [to, metadataUri],
  });

  // Wait for receipt to get the token ID
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  // Parse Transfer event to get tokenId
  // Transfer(address(0), to, tokenId) — tokenId is topic[3]
  const transferLog = receipt.logs.find(
    (log) =>
      log.topics[0] ===
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
  );

  const tokenId = transferLog
    ? BigInt(transferLog.topics[3]!)
    : BigInt(0);

  console.log(
    `[nft] Minted token #${tokenId} to ${to} | tx: ${txHash}`
  );

  return { tokenId, txHash };
}

// ── Read helpers ───────────────────────────────────────
export async function getTotalMinted(): Promise<bigint> {
  try {
    const contractAddress = getContractAddress();
    return (await publicClient.readContract({
      address: contractAddress,
      abi: PIXELPAY_NFT_ABI,
      functionName: "totalSupply",
    })) as bigint;
  } catch {
    return BigInt(0);
  }
}
