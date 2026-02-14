import * as solc from "solc";
import fs from "fs";
import path from "path";

const CONTRACT_PATH = path.join(__dirname, "../../contracts/PixelPayNFT.sol");
const OUTPUT_PATH = path.join(__dirname, "compiled.json");

const source = fs.readFileSync(CONTRACT_PATH, "utf-8");

const input = {
  language: "Solidity",
  sources: {
    "PixelPayNFT.sol": { content: source },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
    optimizer: { enabled: true, runs: 200 },
  },
};

console.log("Compiling PixelPayNFT.sol...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const hasError = output.errors.some(
    (e: { severity: string; formattedMessage: string }) => {
      if (e.severity === "error") {
        console.error(e.formattedMessage);
        return true;
      }
      console.warn(e.formattedMessage);
      return false;
    }
  );
  if (hasError) {
    process.exit(1);
  }
}

const contract = output.contracts["PixelPayNFT.sol"]["PixelPayNFT"];
const compiled = {
  abi: contract.abi,
  bytecode: "0x" + contract.evm.bytecode.object,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(compiled, null, 2));
console.log(`Compiled successfully → ${OUTPUT_PATH}`);
console.log(`  ABI entries: ${compiled.abi.length}`);
console.log(`  Bytecode size: ${compiled.bytecode.length} chars`);
