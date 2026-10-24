import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log(`\n============================================================`);
  console.log(`🧪 BotInsure Keeper Trigger Simulation Test`);
  console.log(`Network: ${network.name}`);
  console.log(`============================================================\n`);

  const [signer] = await ethers.getSigners();
  const oracleAddress = process.env.NEXT_PUBLIC_BOTORACLE_CONTRACT_ADDRESS || "0xb7Ca90c5d60B86CF08B4BE94c973EcCCa4D2f844";
  const botOracle = await ethers.getContractAt("MockBotOracle", oracleAddress, signer);

  // 1. Set Feed #1 Price to $0.65 (65,000,000, 8 decimals) with fresh timestamp
  console.log(`📉 Simulating acute market drop: Setting Feed #1 (BOT/USD) to $0.65...`);
  const triggerPrice = 65_000_000; // $0.65
  const tx = await botOracle.setPrice(1, triggerPrice);
  await tx.wait();
  console.log(`✅ Oracle updated! Feed #1 is now $0.65 (Trigger threshold is <= $0.70)`);
  console.log(`🔗 BotScan Tx: https://scan.botchain.ai/tx/${tx.hash}\n`);

  console.log(`👉 Now run the Keeper Bot to autonomously detect and execute the trigger:`);
  console.log(`   npm run keeper\n`);
  console.log(`============================================================\n`);
}

main().catch((err) => {
  console.error("Simulation failed:", err);
  process.exitCode = 1;
});
