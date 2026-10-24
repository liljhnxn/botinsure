import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`\n==================================================`);
  console.log(`Deploying BotInsure Protocol to ${network.name}`);
  console.log(`==================================================\n`);

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} BOT\n`);

  // Use existing live addresses from .env (no mocks)
  const botTokenAddress = process.env.NEXT_PUBLIC_BOT_TOKEN_ADDRESS || "0xD5452816194a3784dBa983426cCe7c122F4abd30";
  const botOracleAddress = process.env.NEXT_PUBLIC_BOTORACLE_CONTRACT_ADDRESS || "0xb7Ca90c5d60B86CF08B4BE94c973EcCCa4D2f844";
  const botLendAddress = process.env.NEXT_PUBLIC_BOTLEND_CONTRACT_ADDRESS || "0x7D097D3C1C56Fb555F76f7C57E84543CAeB6674a";

  console.log(`Live BOT Token (WBOT): ${botTokenAddress}`);
  console.log(`Live BotOracle:        ${botOracleAddress}`);
  console.log(`Live BotLend:          ${botLendAddress}\n`);

  // Fixed optimal gas price: 20 Gwei (network minimum base fee)
  const gasPrice = ethers.parseUnits("20", "gwei");

  // 1. Deploy Factory (needed to create pool share tokens)
  console.log("1. Deploying BotInsurePoolTokenFactory...");
  const Factory = await ethers.getContractFactory("BotInsurePoolTokenFactory");
  const factory = await Factory.deploy({ gasPrice });
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`   Factory deployed at: ${factoryAddress}\n`);

  // 2. Deploy BotInsure Core
  console.log("2. Deploying BotInsure Core Contract...");
  const treasuryAddress = deployer.address;
  const BotInsure = await ethers.getContractFactory("BotInsure");
  const botInsure = await BotInsure.deploy(
    botTokenAddress,
    botOracleAddress,
    botLendAddress,
    treasuryAddress,
    factoryAddress,
    { gasPrice }
  );
  await botInsure.waitForDeployment();
  const botInsureAddress = await botInsure.getAddress();
  console.log(`   BotInsure Core deployed at: ${botInsureAddress}\n`);

  // 3. Create Protection Pools
  console.log("3. Creating Protection Pool 1: BOT Price Protection Pool...");
  const txPool1 = await botInsure.createPool(
    "BOT Price Protection Pool",
    "BotInsure Price Protection Share",
    "biBOT-PRICE",
    { gasPrice }
  );
  await txPool1.wait();
  const pool1 = await botInsure.getPool(1);
  console.log(`   Pool 1 created with Share Token at: ${pool1.shareToken}`);

  console.log("4. Creating Protection Pool 2: BotLend Liquidation Protection Pool...");
  const txPool2 = await botInsure.createPool(
    "BotLend Liquidation Protection Pool",
    "BotInsure BotLend Protection Share",
    "biBOT-LEND",
    { gasPrice }
  );
  await txPool2.wait();
  const pool2 = await botInsure.getPool(2);
  console.log(`   Pool 2 created with Share Token at: ${pool2.shareToken}\n`);

  // 5. Create Protection Products
  console.log("5. Creating Product 1: BOT Price Drop Protection...");
  const txProd1 = await botInsure.createProduct(
    {
      name: "BOT Price Drop Protection",
      description: "Parametric protection against BOT falling to or below $0.70 within duration.",
      productType: 0, // BOT_PRICE_PROTECTION
      minCoverage: ethers.parseEther("100"),
      maxCoverage: ethers.parseEther("10000"),
      premiumRate: 500, // 5% annual rate
      maxDuration: 90 * 86400, // 90 days
      payoutBps: 10_000, // 100% payout
      poolId: 1,
      oracleFeedId: 1,
      triggerType: 0, // PRICE_BELOW
      triggerValue: 70_000_000, // $0.70 (8 decimals)
    },
    { gasPrice }
  );
  await txProd1.wait();
  console.log("   Product 1 created (Trigger: BOT <= $0.70)");

  console.log("6. Creating Product 2: BotLend Liquidation Protection...");
  const txProd2 = await botInsure.createProduct(
    {
      name: "BotLend Liquidation Protection",
      description: "Protection against loan collateral health factor falling below 1.0 on BotLend.",
      productType: 1, // BOTLEND_LIQUIDATION_PROTECTION
      minCoverage: ethers.parseEther("200"),
      maxCoverage: ethers.parseEther("15000"),
      premiumRate: 600, // 6% annual rate
      maxDuration: 180 * 86400, // 180 days
      payoutBps: 8_500, // 85% payout
      poolId: 2,
      oracleFeedId: 0,
      triggerType: 1, // HEALTH_FACTOR_BELOW
      triggerValue: ethers.parseUnits("1.0", 18), // HF < 1.0
    },
    { gasPrice }
  );
  await txProd2.wait();
  console.log("   Product 2 created (Trigger: Health Factor < 1.0)\n");

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const totalGasSpent = balance - finalBalance;
  console.log(`Deployment gas spent: ${ethers.formatEther(totalGasSpent)} BOT`);
  console.log(`Remaining balance:    ${ethers.formatEther(finalBalance)} BOT\n`);

  // Save deployment artifact
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId || 677,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasSpentBOT: ethers.formatEther(totalGasSpent),
    contracts: {
      BotInsure: botInsureAddress,
      BotToken: botTokenAddress,
      BotOracle: botOracleAddress,
      BotLend: botLendAddress,
      PoolTokenFactory: factoryAddress,
      Pool1ShareToken: pool1.shareToken,
      Pool2ShareToken: pool2.shareToken,
    },
    products: [
      { id: 1, name: "BOT Price Drop Protection", poolId: 1, trigger: "BOT <= $0.70" },
      { id: 2, name: "BotLend Liquidation Protection", poolId: 2, trigger: "Health Factor < 1.0" },
    ],
    pools: [
      { id: 1, name: "BOT Price Protection Pool", shareToken: pool1.shareToken },
      { id: 2, name: "BotLend Liquidation Protection Pool", shareToken: pool2.shareToken },
    ],
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`Deployment manifest saved to: ${deploymentPath}`);

  // Write to frontend config directory for instant sync
  const frontendConfigDir = path.join(__dirname, "../frontend/src/config");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }
  const frontendManifestPath = path.join(frontendConfigDir, `deployedContracts.json`);
  fs.writeFileSync(frontendManifestPath, JSON.stringify(deploymentData, null, 2));
  console.log(`Frontend contracts manifest written to: ${frontendManifestPath}\n`);

  // Update .env files
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    envContent = envContent.replace(
      /NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=${botInsureAddress}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env with NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=${botInsureAddress}`);
  }

  const frontendEnvPath = path.join(__dirname, "../frontend/.env.local");
  if (fs.existsSync(frontendEnvPath)) {
    let frontendEnv = fs.readFileSync(frontendEnvPath, "utf-8");
    frontendEnv = frontendEnv.replace(
      /NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=${botInsureAddress}`
    );
    frontendEnv = frontendEnv.replace(
      /NEXT_PUBLIC_POOL1_SHARE_TOKEN=.*/,
      `NEXT_PUBLIC_POOL1_SHARE_TOKEN=${pool1.shareToken}`
    );
    frontendEnv = frontendEnv.replace(
      /NEXT_PUBLIC_POOL2_SHARE_TOKEN=.*/,
      `NEXT_PUBLIC_POOL2_SHARE_TOKEN=${pool2.shareToken}`
    );
    fs.writeFileSync(frontendEnvPath, frontendEnv);
    console.log(`Updated frontend/.env.local with new contract and pool token addresses\n`);
  }

  console.log(`==================================================`);
  console.log(`BotInsure Protocol Successfully Deployed to Mainnet!`);
  console.log(`Core Contract:  ${botInsureAddress}`);
  console.log(`Pool 1 Token:   ${pool1.shareToken}`);
  console.log(`Pool 2 Token:   ${pool2.shareToken}`);
  console.log(`Explorer:       https://scan.botchain.ai/address/${botInsureAddress}`);
  console.log(`==================================================\n`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
