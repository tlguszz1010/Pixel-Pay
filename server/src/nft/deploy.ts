import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { monadTestnet } from "./client";
import { setSetting } from "../db/queries";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const COMPILED_PATH = path.join(__dirname, "compiled.json");

async function deploy() {
  // Load compiled contract
  if (!fs.existsSync(COMPILED_PATH)) {
    console.error("compiled.json not found. Run compile.ts first.");
    process.exit(1);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(COMPILED_PATH, "utf-8"));

  // Setup account (mnemonic or private key)
  const mnemonic = process.env.SELLER_MNEMONIC;
  const privateKey = process.env.SELLER_PRIVATE_KEY;
  if (!mnemonic && !privateKey) {
    console.error("SELLER_MNEMONIC or SELLER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const account = mnemonic
    ? mnemonicToAccount(mnemonic)
    : privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Deploying from: ${account.address}`);

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${balance} MON (wei)`);

  if (balance === BigInt(0)) {
    console.error("No MON balance for gas. Get testnet MON from faucet.");
    process.exit(1);
  }

  // Deploy
  console.log("Deploying PixelPayNFT contract...");
  const txHash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
  });

  console.log(`Deploy tx: ${txHash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const contractAddress = receipt.contractAddress!;

  console.log(`Contract deployed at: ${contractAddress}`);
  console.log(`Explorer: https://monadscan.com/address/${contractAddress}`);

  // Save to DB settings
  setSetting("nft_contract_address", contractAddress);
  console.log("Saved contract address to DB settings.");
}

deploy().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
