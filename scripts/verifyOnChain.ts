import { ethers } from "hardhat";

async function main() {
  const address = process.env.NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS || "0xD874Fad6896fA787D1793F6233C8021D0c2451F4";
  const botInsure = await ethers.getContractAt("BotInsure", address);

  console.log("\n--- Querying Live BotInsure Contract ---");
  console.log("Contract Address:", address);
  
  const stats = await botInsure.getProtocolStats();
  console.log("Pool Count:", stats.poolCount.toString());
  console.log("Product Count:", stats.productCount.toString());
  console.log("Total Pool Liquidity:", ethers.formatEther(stats.totalPoolLiquidity), "BOT");

  const pool1 = await botInsure.getPool(1);
  console.log("Pool 1 Name:", pool1.name);
  console.log("Pool 1 Deposited:", ethers.formatEther(pool1.totalDeposited), "BOT");
  console.log("Pool 1 Share Token:", pool1.shareToken);

  const prod1 = await botInsure.getProduct(1);
  console.log("Product 1 Name:", prod1.name);
  console.log("Product 1 Active:", prod1.active);
  console.log("Product 1 Premium Rate:", prod1.premiumRate.toString(), "bps");

  console.log("--- Contract State Verified On-Chain! ---\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
