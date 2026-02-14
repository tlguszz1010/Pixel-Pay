import { initSDK, parseEther } from "@nadfun/sdk";
import { createPublicClient, http, formatEther } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "../nft/client";
import { setSetting, getSetting } from "../db/queries";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function deployToken() {
  // Check if already deployed
  const existing = getSetting("pxpay_token_address");
  if (existing) {
    console.log(`PXPAY token already deployed at: ${existing}`);
    console.log(`nad.fun: https://nad.fun/token/${existing}`);
    console.log("Delete 'pxpay_token_address' from settings to redeploy.");
    return;
  }

  // Derive private key from mnemonic or use directly
  const mnemonic = process.env.SELLER_MNEMONIC;
  const privateKeyEnv = process.env.SELLER_PRIVATE_KEY;

  let privateKey: `0x${string}`;

  if (mnemonic) {
    const account = mnemonicToAccount(mnemonic);
    // viem's mnemonicToAccount doesn't expose the private key directly,
    // so we need to derive it using @scure/bip32 + @scure/bip39
    const { HDKey } = await import("@scure/bip32");
    const { mnemonicToSeedSync } = await import("@scure/bip39");
    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derived = hdKey.derive("m/44'/60'/0'/0/0");
    privateKey = `0x${Buffer.from(derived.privateKey!).toString("hex")}`;
    console.log(`Using mnemonic-derived account: ${account.address}`);
  } else if (privateKeyEnv) {
    privateKey = privateKeyEnv as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    console.log(`Using private key account: ${account.address}`);
  } else {
    console.error("SELLER_MNEMONIC or SELLER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  // Check MON balance
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const account = privateKeyToAccount(privateKey);
  const balance = await publicClient.getBalance({
    address: account.address,
  });
  console.log(`MON Balance: ${formatEther(balance)} MON`);

  const minBalance = parseEther("2"); // 2 MON for deploy fee + initial buy
  if (balance < minBalance) {
    console.error(
      `Insufficient MON balance. Need at least 2 MON (have ${formatEther(balance)})`
    );
    console.error("Get testnet MON from faucet: https://faucet.monad.xyz");
    process.exit(1);
  }

  // Initialize nad.fun SDK
  console.log("Initializing nad.fun SDK...");
  const nadSDK = initSDK({
    rpcUrl: "https://rpc.monad.xyz",
    privateKey,
    network: "mainnet",
  });

  // Get deploy fee
  const feeConfig = await nadSDK.getFeeConfig();
  console.log(`Deploy fee: ${formatEther(feeConfig.deployFeeAmount)} MON`);

  // Prepare token image
  const imagePath = path.join(__dirname, "token-image.png");
  let imageBuffer: Buffer;

  if (fs.existsSync(imagePath)) {
    imageBuffer = fs.readFileSync(imagePath);
    console.log("Using custom token-image.png");
  } else {
    // Generate a simple 1x1 pixel PNG as placeholder
    // Users should replace with actual token image
    console.log("No token-image.png found, downloading placeholder...");
    const response = await fetch("https://picsum.photos/512/512");
    const arrayBuffer = await response.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(imagePath, imageBuffer);
    console.log("Saved placeholder image to token-image.png");
  }

  // Create token on nad.fun
  console.log("Creating $PXPAY token on nad.fun...");
  console.log("  Name: PixelPay");
  console.log("  Symbol: PXPAY");
  console.log("  Initial buy: 1.0 MON");

  const result = await nadSDK.createToken({
    name: "PixelPay",
    symbol: "PXPAY",
    description:
      "The reward token for PixelPay — an autonomous agent-to-agent AI art economy powered by x402 micropayments on Monad. Earn $PXPAY by purchasing AI-generated images.",
    image: imageBuffer,
    imageContentType: "image/png",
    website: "https://github.com/pxpay",
    twitter: "https://x.com/pxpay",
    telegram: "",
    initialBuyAmount: parseEther("1.0"),
  });

  const tokenAddress = result.tokenAddress;
  console.log(`\nToken deployed successfully!`);
  console.log(`  Token Address: ${tokenAddress}`);
  console.log(`  Pool Address: ${result.poolAddress}`);
  console.log(`  TX Hash: ${result.transactionHash}`);
  console.log(
    `  Explorer: https://monadscan.com/address/${tokenAddress}`
  );
  console.log(`  nad.fun: https://nad.fun/token/${tokenAddress}`);

  // Save to DB settings
  setSetting("pxpay_token_address", tokenAddress);
  setSetting("pxpay_reward_per_purchase", "100");
  console.log("\nSaved token address + reward config to DB settings.");
  console.log("Default reward: 100 PXPAY per purchase");
}

deployToken().catch((err) => {
  console.error("Token deploy failed:", err);
  process.exit(1);
});
