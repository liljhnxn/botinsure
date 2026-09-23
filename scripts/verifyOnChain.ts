import { ethers } from "hardhat";

async function main() {
  const address = "0xdc04788364d51f8A836794694a728322634bD4Ac";
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
