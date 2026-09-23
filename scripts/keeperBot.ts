import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

// Policy status enum mapping
enum PolicyStatus {
  ACTIVE = 0,
  TRIGGERED = 1,
  CLAIMABLE = 2,
  CLAIMED = 3,
  EXPIRED = 4,
  CANCELLED = 5,
}

const STATUS_LABELS = ["ACTIVE", "TRIGGERED", "CLAIMABLE", "CLAIMED", "EXPIRED", "CANCELLED"];

async function runKeeperSweep() {
  const timestamp = new Date().toISOString();
  console.log(`\n============================================================`);
  console.log(`🤖 BotInsure Autonomous Keeper Bot Sweep`);
  console.log(`Network: ${network.name} | Time: ${timestamp}`);
  console.log(`============================================================\n`);

  const [keeper] = await ethers.getSigners();
  if (!keeper) {
    throw new Error("No keeper signer available. Ensure DEPLOYER_PRIVATE_KEY is set in .env");
  }

  const keeperBal = await ethers.provider.getBalance(keeper.address);
  console.log(`Keeper Account: ${keeper.address}`);
  console.log(`Keeper Gas Balance: ${ethers.formatEther(keeperBal)} BOT\n`);

  // Load contract addresses
  let botInsureAddress = process.env.NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS;
  if (!botInsureAddress) {
    const deploymentPath = path.join(__dirname, `../deployments/${network.name}.json`);
    if (fs.existsSync(deploymentPath)) {
      const data = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      botInsureAddress = data.contracts?.BotInsure;
    }
  }

  if (!botInsureAddress) {
    throw new Error("BotInsure contract address not found in .env or deployments.");
  }

  const botInsure = await ethers.getContractAt("BotInsure", botInsureAddress, keeper);
  const oracleAddress = await botInsure.botOracle();
  const botOracle = await ethers.getContractAt("IBotOracle", oracleAddress, keeper);

  // 1. Oracle Health & Feeds Summary
  console.log(`📡 [ORACLE MONITOR] Checking Live Price Feeds...`);
  try {
    const [price, updatedAt] = await botOracle.getLatestAnswer(1);
    const priceFormatted = (Number(price) / 1e8).toFixed(4);
    const now = Math.floor(Date.now() / 1000);
    const ageSeconds = now - Number(updatedAt);
    console.log(`   Feed #1 (BOT/USD): $${priceFormatted} (Updated ${ageSeconds}s ago)`);
  } catch (err: any) {
    console.warn(`   ⚠️ Unable to read Feed #1: ${err.message}`);
  }

  // 2. Scan All Policies
  const policyCount = await botInsure.policyCount();
  console.log(`\n📋 [POLICY SCAN] Found ${policyCount.toString()} total policies on-chain.`);

  if (policyCount === 0n) {
    console.log(`   ℹ️ No policies registered yet. Standing by for user protection purchases.`);
    return;
  }

  const block = await ethers.provider.getBlock("latest");
  const blockTime = BigInt(block?.timestamp || Math.floor(Date.now() / 1000));

  let triggeredCount = 0;
  let expiredCount = 0;
  let activeCount = 0;

  for (let i = 1n; i <= policyCount; i++) {
    const policy = await botInsure.getPolicy(i);
    const status = Number(policy.status);
    const statusLabel = STATUS_LABELS[status] || `UNKNOWN(${status})`;

    // Check Expired Active Policies
    if (status === PolicyStatus.ACTIVE && blockTime > policy.expiryTime) {
      console.log(`\n🧹 [EXPIRE SWEEP] Policy #${i} expired (Expiry: ${policy.expiryTime}, Current: ${blockTime}). Cleaning up...`);
      try {
        const tx = await botInsure.expirePolicy(i);
        console.log(`   Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Policy #${i} marked EXPIRED. Unlocked ${ethers.formatEther(policy.coverageAmount)} BOT pool coverage.`);
        console.log(`   🔗 Explorer: https://scan.bohr.life/tx/${tx.hash}`);
        expiredCount++;
      } catch (err: any) {
        console.error(`   ❌ Failed to expire Policy #${i}:`, err.message);
      }
      continue;
    }

    // Check Trigger Eligibility for Active Policies
    if (status === PolicyStatus.ACTIVE) {
      activeCount++;
      const [isEligible, reason] = await botInsure.checkPolicyTrigger(i);

      if (isEligible) {
        console.log(`\n🚨 [TRIGGER DETECTED] Policy #${i} is ELIGIBLE for trigger activation!`);
        console.log(`   Reason: ${reason}`);
        console.log(`   Product ID: ${policy.productId.toString()} | Holder: ${policy.holder}`);
        console.log(`   Coverage: ${ethers.formatEther(policy.coverageAmount)} BOT`);

        try {
          console.log(`   Executing activateTrigger(${i})...`);
          const tx = await botInsure.activateTrigger(i);
          console.log(`   Transaction submitted: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`   ⚡ Policy #${i} successfully TRIGGERED and is now CLAIMABLE by holder!`);
          console.log(`   🔗 Explorer: https://scan.bohr.life/tx/${tx.hash}`);
          triggeredCount++;
        } catch (err: any) {
          console.error(`   ❌ Failed to activate trigger for Policy #${i}:`, err.message);
        }
      } else {
        console.log(`   Policy #${i} [${statusLabel}]: Normal (${reason})`);
      }
    } else {
      console.log(`   Policy #${i} [${statusLabel}]: No action required.`);
    }
  }

  console.log(`\n📊 [SWEEP SUMMARY]`);
  console.log(`   Active Policies Monitored: ${activeCount}`);
  console.log(`   Autonomous Triggers Fired: ${triggeredCount}`);
  console.log(`   Expired Policies Cleaned:  ${expiredCount}`);
  console.log(`============================================================\n`);
}

async function main() {
  const isWatchMode = process.argv.includes("--watch");
  const intervalSeconds = parseInt(process.env.KEEPER_INTERVAL || "15", 10);

  if (isWatchMode) {
    console.log(`🚀 Starting BotInsure Autonomous Keeper Daemon (Polling every ${intervalSeconds}s)...`);
    console.log(`Press Ctrl+C to exit.\n`);

    const loop = async () => {
      try {
        await runKeeperSweep();
      } catch (err: any) {
        console.error(`Keeper loop iteration error:`, err);
      }
      setTimeout(loop, intervalSeconds * 1000);
    };

    await loop();
  } else {
    // Single execution
    await runKeeperSweep();
  }
}

main().catch((error) => {
  console.error("Keeper script failed:", error);
  process.exitCode = 1;
});
