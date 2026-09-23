import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`\n==================================================`);
  console.log(`Starting BotInsure Protocol Deployment on ${network.name}`);
  console.log(`==================================================\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer account: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} BOT/native\n`);

  let botTokenAddress = process.env.NEXT_PUBLIC_BOT_TOKEN_ADDRESS;
  let botOracleAddress = process.env.NEXT_PUBLIC_BOTORACLE_CONTRACT_ADDRESS;
  let botLendAddress = process.env.NEXT_PUBLIC_BOTLEND_CONTRACT_ADDRESS;

  // 1. Deploy MockBOT if not provided or on local/testnet
  if (!botTokenAddress) {
    console.log("Deploying MockBOT Token...");
    const MockBOT = await ethers.getContractFactory("MockBOT");
    const botToken = await MockBOT.deploy();
    await botToken.waitForDeployment();
    botTokenAddress = await botToken.getAddress();
    console.log(`MockBOT deployed at: ${botTokenAddress}`);
  } else {
    console.log(`Using existing BOT Token at: ${botTokenAddress}`);
  }

  // 2. Deploy MockBotOracle if not provided
  if (!botOracleAddress) {
    console.log("Deploying MockBotOracle...");
    const MockBotOracle = await ethers.getContractFactory("MockBotOracle");
    const botOracle = await MockBotOracle.deploy();
    await botOracle.waitForDeployment();
    botOracleAddress = await botOracle.getAddress();
    console.log(`MockBotOracle deployed at: ${botOracleAddress}`);

    // Initialize Feed 1 (BOT/USD = $1.00, 8 decimals)
    const tx = await botOracle.setPrice(1, 100_000_000);
    await tx.wait();
    console.log("Initialized Feed 1 (BOT/USD) price at $1.00");
  } else {
    console.log(`Using existing BotOracle at: ${botOracleAddress}`);
  }

  // 3. Deploy MockBotLend if not provided
  if (!botLendAddress) {
    console.log("Deploying MockBotLend...");
    const MockBotLend = await ethers.getContractFactory("MockBotLend");
    const botLend = await MockBotLend.deploy();
    await botLend.waitForDeployment();
    botLendAddress = await botLend.getAddress();
    console.log(`MockBotLend deployed at: ${botLendAddress}`);
  } else {
    console.log(`Using existing BotLend at: ${botLendAddress}`);
  }

  // 4. Deploy BotInsurePoolTokenFactory
  console.log("Deploying BotInsurePoolTokenFactory...");
  const BotInsurePoolTokenFactory = await ethers.getContractFactory("BotInsurePoolTokenFactory");
  const tokenFactory = await BotInsurePoolTokenFactory.deploy();
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await tokenFactory.getAddress();
  console.log(`BotInsurePoolTokenFactory deployed at: ${tokenFactoryAddress}`);

  // 5. Deploy BotInsure Core
  console.log("Deploying BotInsure Protocol Core...");
  const treasuryAddress = deployer.address; // Initial treasury
  const BotInsure = await ethers.getContractFactory("BotInsure");
  const botInsure = await BotInsure.deploy(
    botTokenAddress,
    botOracleAddress,
    botLendAddress,
    treasuryAddress,
    tokenFactoryAddress
  );
  await botInsure.waitForDeployment();
  const botInsureAddress = await botInsure.getAddress();
  console.log(`BotInsure Core deployed at: ${botInsureAddress}\n`);

  // 5. Create Protection Pools
  console.log("Creating Protection Pool 1: BOT Price Protection Pool...");
  const txPool1 = await botInsure.createPool(
    "BOT Price Protection Pool",
    "BotInsure Price Protection Share",
    "biBOT-PRICE"
  );
  await txPool1.wait();
  const pool1 = await botInsure.getPool(1);
  console.log(`Pool 1 created with Share Token at: ${pool1.shareToken}`);

  console.log("Creating Protection Pool 2: BotLend Liquidation Protection Pool...");
  const txPool2 = await botInsure.createPool(
    "BotLend Liquidation Protection Pool",
    "BotInsure BotLend Protection Share",
    "biBOT-LEND"
  );
  await txPool2.wait();
  const pool2 = await botInsure.getPool(2);
  console.log(`Pool 2 created with Share Token at: ${pool2.shareToken}\n`);

  // 6. Create Protection Products
  console.log("Creating Product 1: BOT Price Drop Protection...");
  const txProd1 = await botInsure.createProduct({
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
  });
  await txProd1.wait();
  console.log("Product 1 created (Trigger: BOT <= $0.70)");

  console.log("Creating Product 2: BotLend Liquidation Protection...");
  const txProd2 = await botInsure.createProduct({
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
  });
  await txProd2.wait();
  console.log("Product 2 created (Trigger: Health Factor < 1.0)\n");

  // 7. Seed Initial Liquidity
  console.log("Checking BOT balance for liquidity seeding...");
  const botToken = await ethers.getContractAt("MockBOT", botTokenAddress);
  const deployerBotBal = await botToken.balanceOf(deployer.address);
  if (deployerBotBal >= ethers.parseEther("100000")) {
    console.log("Seeding initial liquidity to pools...");
    const approveTx = await botToken.approve(botInsureAddress, ethers.parseEther("200000"));
    await approveTx.wait();

    // Deposit 50,000 BOT into Pool 1
    const depTx1 = await botInsure.provideLiquidity(1, ethers.parseEther("50000"));
    await depTx1.wait();
    console.log("Deposited 50,000 BOT liquidity into Pool 1");

    // Deposit 50,000 BOT into Pool 2
    const depTx2 = await botInsure.provideLiquidity(2, ethers.parseEther("50000"));
    await depTx2.wait();
    console.log("Deposited 50,000 BOT liquidity into Pool 2\n");
  } else {
    console.log(`Deployer BOT balance (${ethers.formatEther(deployerBotBal)}) is lower than 100,000 BOT; skipping auto-seeding. Pools are ready for LP deposits.\n`);
  }

  // Save deployment artifact
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId || 31337,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      BotInsure: botInsureAddress,
      BotToken: botTokenAddress,
      BotOracle: botOracleAddress,
      BotLend: botLendAddress,
      PoolTokenFactory: tokenFactoryAddress,
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

  // Also write to frontend config directory for instant live sync
  const frontendConfigDir = path.join(__dirname, "../frontend/src/config");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }
  const frontendManifestPath = path.join(frontendConfigDir, `deployedContracts.json`);
  fs.writeFileSync(frontendManifestPath, JSON.stringify(deploymentData, null, 2));
  console.log(`Frontend contracts manifest written to: ${frontendManifestPath}\n`);

  // Update .env with new BotInsure address
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    envContent = envContent.replace(
      /NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=${botInsureAddress}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated .env with NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS=${botInsureAddress}\n`);
  }

  console.log(`==================================================`);
  console.log(`Deployment Completed Successfully!`);
  console.log(`==================================================\n`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
