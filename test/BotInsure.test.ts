import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  BotInsure,
  MockBOT,
  MockBotOracle,
  MockBotLend,
  BotInsurePoolToken__factory,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BotInsure Protocol Test Suite", function () {
  let botToken: MockBOT;
  let botOracle: MockBotOracle;
  let botLend: MockBotLend;
  let botInsure: BotInsure;
  let tokenFactory: any;

  let owner: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let lp1: HardhatEthersSigner;
  let lp2: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  const PRICE_FEED_ID = 1;
  const INITIAL_BOT_PRICE = 100_000_000; // $1.00 (8 decimals)
  const TRIGGER_BOT_PRICE = 70_000_000;  // $0.70 (8 decimals)

  const parseBOT = (val: string | number) => ethers.parseEther(val.toString());

  beforeEach(async function () {
    [owner, treasury, lp1, lp2, user1, user2, unauthorized] = await ethers.getSigners();

    // 1. Deploy Mock BOT token
    const MockBOTFactory = await ethers.getContractFactory("MockBOT");
    botToken = await MockBOTFactory.deploy();

    // 2. Deploy MockBotOracle
    const MockBotOracleFactory = await ethers.getContractFactory("MockBotOracle");
    botOracle = await MockBotOracleFactory.deploy();

    // Configure Feed 1: BOT/USD initial price = $1.00
    const now = await time.latest();
    await botOracle.setFeed(PRICE_FEED_ID, INITIAL_BOT_PRICE, now, 1, 8);

    // 3. Deploy MockBotLend
    const MockBotLendFactory = await ethers.getContractFactory("MockBotLend");
    botLend = await MockBotLendFactory.deploy();

    // 4. Deploy BotInsurePoolTokenFactory and BotInsure
    const TokenFactory = await ethers.getContractFactory("BotInsurePoolTokenFactory");
    tokenFactory = await TokenFactory.deploy();

    const BotInsureFactory = await ethers.getContractFactory("BotInsure");
    botInsure = await BotInsureFactory.deploy(
      await botToken.getAddress(),
      await botOracle.getAddress(),
      await botLend.getAddress(),
      treasury.address,
      await tokenFactory.getAddress()
    );

    // Fund test accounts with BOT tokens
    await botToken.transfer(lp1.address, parseBOT(100_000));
    await botToken.transfer(lp2.address, parseBOT(100_000));
    await botToken.transfer(user1.address, parseBOT(20_000));
    await botToken.transfer(user2.address, parseBOT(20_000));

    // Approvals for BotInsure contract
    const botInsureAddress = await botInsure.getAddress();
    await botToken.connect(lp1).approve(botInsureAddress, ethers.MaxUint256);
    await botToken.connect(lp2).approve(botInsureAddress, ethers.MaxUint256);
    await botToken.connect(user1).approve(botInsureAddress, ethers.MaxUint256);
    await botToken.connect(user2).approve(botInsureAddress, ethers.MaxUint256);
  });

  describe("1. Deployment & Roles", function () {
    it("Should correctly set initial state and roles", async function () {
      expect(await botInsure.botToken()).to.equal(await botToken.getAddress());
      expect(await botInsure.botOracle()).to.equal(await botOracle.getAddress());
      expect(await botInsure.botLend()).to.equal(await botLend.getAddress());
      expect(await botInsure.treasury()).to.equal(treasury.address);

      expect(await botInsure.hasRole(await botInsure.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await botInsure.hasRole(await botInsure.PRODUCT_MANAGER_ROLE(), owner.address)).to.be.true;
      expect(await botInsure.hasRole(await botInsure.POOL_MANAGER_ROLE(), owner.address)).to.be.true;
      expect(await botInsure.hasRole(await botInsure.ORACLE_MANAGER_ROLE(), owner.address)).to.be.true;
      expect(await botInsure.hasRole(await botInsure.PAUSER_ROLE(), owner.address)).to.be.true;
    });

    it("Should reject deployment with zero addresses", async function () {
      const BotInsureFactory = await ethers.getContractFactory("BotInsure");
      await expect(
        BotInsureFactory.deploy(ethers.ZeroAddress, await botOracle.getAddress(), await botLend.getAddress(), treasury.address, await tokenFactory.getAddress())
      ).to.be.revertedWith("BotInsure: zero botToken address");

      await expect(
        BotInsureFactory.deploy(await botToken.getAddress(), await botOracle.getAddress(), await botLend.getAddress(), ethers.ZeroAddress, await tokenFactory.getAddress())
      ).to.be.revertedWith("BotInsure: zero treasury address");

      await expect(
        BotInsureFactory.deploy(await botToken.getAddress(), await botOracle.getAddress(), await botLend.getAddress(), treasury.address, ethers.ZeroAddress)
      ).to.be.revertedWith("BotInsure: zero tokenFactory address");
    });
  });

  describe("2. Pool Creation & Liquidity Management", function () {
    let poolId: bigint;

    beforeEach(async function () {
      const tx = await botInsure.createPool("BOT Price Protection Pool", "biBOT-PRICE", "biBOTP");
      const receipt = await tx.wait();
      poolId = 1n;
    });

    it("Should create pool and deploy dedicated share token", async function () {
      const pool = await botInsure.getPool(poolId);
      expect(pool.name).to.equal("BOT Price Protection Pool");
      expect(pool.shareToken).to.not.equal(ethers.ZeroAddress);
      expect(pool.active).to.be.true;
    });

    it("Should prevent unauthorized users from creating pools", async function () {
      await expect(
        botInsure.connect(unauthorized).createPool("Hacked Pool", "hBOT", "hB")
      ).to.be.reverted;
    });

    it("Should allow liquidity deposits and mint correct shares", async function () {
      // First deposit: 10,000 BOT
      const depositAmount1 = parseBOT(10_000);
      await expect(botInsure.connect(lp1).provideLiquidity(poolId, depositAmount1))
        .to.emit(botInsure, "LiquidityProvided")
        .withArgs(poolId, lp1.address, depositAmount1, depositAmount1);

      const [shares1, botAmount1] = await botInsure.getUserLiquidity(lp1.address, poolId);
      expect(shares1).to.equal(depositAmount1);
      expect(botAmount1).to.equal(depositAmount1);

      // Second deposit: 5,000 BOT
      const depositAmount2 = parseBOT(5_000);
      await botInsure.connect(lp2).provideLiquidity(poolId, depositAmount2);

      const [shares2, botAmount2] = await botInsure.getUserLiquidity(lp2.address, poolId);
      expect(shares2).to.equal(depositAmount2);
      expect(botAmount2).to.equal(depositAmount2);

      // Verify pool stats
      const stats = await botInsure.getPoolStats(poolId);
      expect(stats.totalLiquidity).to.equal(parseBOT(15_000));
      expect(stats.availableLiquidity).to.equal(parseBOT(15_000));
    });

    it("Should allow proportional liquidity withdrawals", async function () {
      await botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(10_000));

      const initialBal = await botToken.balanceOf(lp1.address);
      // Withdraw 5,000 shares (50%)
      await botInsure.connect(lp1).withdrawLiquidity(poolId, parseBOT(5_000));
      const afterBal = await botToken.balanceOf(lp1.address);

      expect(afterBal - initialBal).to.equal(parseBOT(5_000));

      const [remainingShares, remainingBot] = await botInsure.getUserLiquidity(lp1.address, poolId);
      expect(remainingShares).to.equal(parseBOT(5_000));
      expect(remainingBot).to.equal(parseBOT(5_000));
    });

    it("Should prevent LP from withdrawing more shares than owned", async function () {
      await botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(1_000));
      await expect(
        botInsure.connect(lp1).withdrawLiquidity(poolId, parseBOT(2_000))
      ).to.be.revertedWith("BotInsure: insufficient share balance");
    });
  });

  describe("3. Product Configuration & Premium Calculation", function () {
    let poolId: bigint;

    beforeEach(async function () {
      await botInsure.createPool("BOT Price Protection Pool", "biBOT-PRICE", "biBOTP");
      poolId = 1n;
    });

    it("Should create BOT Price Protection product", async function () {
      const tx = await botInsure.createProduct({
        name: "BOT Price Drop Protection",
        description: "Covers against BOT price dropping at or below $0.70",
        productType: 0, // BOT_PRICE_PROTECTION
        minCoverage: parseBOT(100),
        maxCoverage: parseBOT(10_000),
        premiumRate: 500, // 5% annual
        maxDuration: 30 * 86400, // 30 days
        payoutBps: 10_000, // 100% payout
        poolId: poolId,
        oracleFeedId: PRICE_FEED_ID,
        triggerType: 0, // PRICE_BELOW
        triggerValue: TRIGGER_BOT_PRICE,
      });

      await expect(tx).to.emit(botInsure, "ProtectionProductCreated");
      const product = await botInsure.getProduct(1n);
      expect(product.name).to.equal("BOT Price Drop Protection");
      expect(product.triggerValue).to.equal(TRIGGER_BOT_PRICE);
      expect(product.active).to.be.true;
    });

    it("Should calculate fixed-point integer premiums correctly with 5% protocol fee", async function () {
      await botInsure.createProduct({
        name: "BOT Price Drop Protection",
        description: "Covers against BOT price dropping at or below $0.70",
        productType: 0,
        minCoverage: parseBOT(100),
        maxCoverage: parseBOT(10_000),
        premiumRate: 500, // 5% annual
        maxDuration: 365 * 86400,
        payoutBps: 10_000,
        poolId: poolId,
        oracleFeedId: PRICE_FEED_ID,
        triggerType: 0,
        triggerValue: TRIGGER_BOT_PRICE,
      });

      const coverage = parseBOT(1_000);
      const duration = 365 * 86400; // 1 year

      // Premium = 1,000 * 500 * (365d) / (10000 * 365d) = 50 BOT
      const [totalPremium, fee, poolPremium] = await botInsure.getPremium(1n, coverage, duration);
      expect(totalPremium).to.equal(parseBOT(50));
      // Protocol fee = 5% of 50 = 2.5 BOT
      expect(fee).to.equal(parseBOT(2.5));
      // Pool premium = 47.5 BOT
      expect(poolPremium).to.equal(parseBOT(47.5));
    });
  });

  describe("4. End-to-End Policy Lifecycle: Price Protection", function () {
    let poolId: bigint;
    let productId: bigint;

    beforeEach(async function () {
      // 1. Create pool
      await botInsure.createPool("BOT Price Protection Pool", "biBOT-PRICE", "biBOTP");
      poolId = 1n;

      // 2. Deposit liquidity: 50,000 BOT
      await botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(50_000));

      // 3. Create product
      await botInsure.createProduct({
        name: "BOT Price Drop Protection",
        description: "Parametric protection against BOT falling to $0.70",
        productType: 0,
        minCoverage: parseBOT(100),
        maxCoverage: parseBOT(10_000),
        premiumRate: 500, // 5% per year
        maxDuration: 30 * 86400,
        payoutBps: 10_000, // 100% payout
        poolId: poolId,
        oracleFeedId: PRICE_FEED_ID,
        triggerType: 0,
        triggerValue: TRIGGER_BOT_PRICE,
      });
      productId = 1n;
    });

    it("Should allow user to buy policy and enforce pool coverage locking", async function () {
      const coverage = parseBOT(1_000);
      const duration = 30 * 86400;

      const tx = await botInsure.connect(user1).buyProtection(productId, coverage, duration, ethers.ZeroAddress);
      await expect(tx).to.emit(botInsure, "PolicyPurchased");

      const policy = await botInsure.getPolicy(1n);
      expect(policy.holder).to.equal(user1.address);
      expect(policy.coverageAmount).to.equal(coverage);
      expect(policy.status).to.equal(0); // ACTIVE

      const poolStats = await botInsure.getPoolStats(poolId);
      expect(poolStats.lockedCoverage).to.equal(coverage);
      expect(poolStats.activePolicies).to.equal(1n);
    });

    it("Should prevent LP withdrawal from draining locked active coverage", async function () {
      const coverage = parseBOT(1_000);
      await botInsure.connect(user1).buyProtection(productId, coverage, 30 * 86400, ethers.ZeroAddress);

      // LP1 owns 50,000 shares. Total net assets = 50,000 + poolPremium. Locked = 1,000.
      // Trying to withdraw all 50,000 shares must revert because net balance - amount < lockedCoverage!
      await expect(
        botInsure.connect(lp1).withdrawLiquidity(poolId, parseBOT(50_000))
      ).to.be.revertedWith("BotInsure: cannot drain required active coverage");
    });

    it("Should evaluate trigger eligibility accurately according to oracle price", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);

      // Price is currently $1.00 (> trigger $0.70)
      let [eligible, reason] = await botInsure.checkPolicyTrigger(1n);
      expect(eligible).to.be.false;
      expect(reason).to.equal("Oracle price above trigger threshold");

      // Drop price to $0.68 (trigger condition satisfied!)
      await botOracle.setPrice(PRICE_FEED_ID, 68_000_000);

      [eligible, reason] = await botInsure.checkPolicyTrigger(1n);
      expect(eligible).to.be.true;
      expect(reason).to.equal("Oracle price met trigger threshold");
    });

    it("Should execute complete trigger activation and claim settlement flow", async function () {
      const coverage = parseBOT(1_000);
      await botInsure.connect(user1).buyProtection(productId, coverage, 30 * 86400, ethers.ZeroAddress);

      // Oracle reports price drop below $0.70
      await botOracle.setPrice(PRICE_FEED_ID, 65_000_000);

      // Activate trigger
      await expect(botInsure.connect(user1).activateTrigger(1n))
        .to.emit(botInsure, "PolicyTriggered");

      const policyAfterTrigger = await botInsure.getPolicy(1n);
      expect(policyAfterTrigger.status).to.equal(1); // TRIGGERED

      // Settle claim
      const initialUserBal = await botToken.balanceOf(user1.address);
      const claimTx = await botInsure.connect(user1).settleClaim(1n);

      await expect(claimTx)
        .to.emit(botInsure, "ClaimSettled")
        .withArgs(1n, user1.address, coverage);

      const finalUserBal = await botToken.balanceOf(user1.address);
      expect(finalUserBal - initialUserBal).to.equal(coverage);

      const policyAfterClaim = await botInsure.getPolicy(1n);
      expect(policyAfterClaim.status).to.equal(3); // CLAIMED
      expect(policyAfterClaim.claimed).to.be.true;

      // Locked coverage unlocked
      const poolStats = await botInsure.getPoolStats(poolId);
      expect(poolStats.lockedCoverage).to.equal(0n);
      expect(poolStats.claimsPaid).to.equal(coverage);
    });
  });

  describe("5. End-to-End BotLend Liquidation Protection", function () {
    let poolId: bigint;
    let productId: bigint;

    beforeEach(async function () {
      await botInsure.createPool("BotLend Protection Pool", "biBOT-LEND", "biBOTL");
      poolId = 1n;
      await botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(50_000));

      // Product: triggers if health factor drops below 1.0 (1e18)
      await botInsure.createProduct({
        name: "BotLend Liquidation Protection",
        description: "Protection against user BotLend loan health factor dropping below 1.0",
        productType: 1, // BOTLEND_LIQUIDATION_PROTECTION
        minCoverage: parseBOT(500),
        maxCoverage: parseBOT(10_000),
        premiumRate: 600, // 6% annual
        maxDuration: 60 * 86400,
        payoutBps: 8_000, // 80% payout
        poolId: poolId,
        oracleFeedId: 0,
        triggerType: 1, // HEALTH_FACTOR_BELOW
        triggerValue: ethers.parseUnits("1.0", 18), // 1e18
      });
      productId = 1n;
    });

    it("Should verify BotLend health factor and disburse claim if undercollateralized", async function () {
      // User position initially healthy: HF = 1.5e18
      await botLend.setPosition(user2.address, ethers.parseUnits("1.5", 18), parseBOT(1_000), parseBOT(2_000));

      const coverage = parseBOT(2_000);
      await botInsure.connect(user2).buyProtection(productId, coverage, 30 * 86400, user2.address);

      // Check trigger: should be healthy
      let [eligible] = await botInsure.checkPolicyTrigger(1n);
      expect(eligible).to.be.false;

      // Position gets distressed: HF drops to 0.85e18 (< 1.0)
      await botLend.setHealthFactor(user2.address, ethers.parseUnits("0.85", 18));

      [eligible] = await botInsure.checkPolicyTrigger(1n);
      expect(eligible).to.be.true;

      // Direct settleClaim (which auto-triggers if eligible)
      const initialBal = await botToken.balanceOf(user2.address);
      await botInsure.connect(user2).settleClaim(1n);
      const afterBal = await botToken.balanceOf(user2.address);

      // Payout is 80% of 2,000 = 1,600 BOT
      expect(afterBal - initialBal).to.equal(parseBOT(1_600));
    });
  });

  describe("6. Security Edge Cases (Prompt Requirements)", function () {
    let poolId: bigint;
    let productId: bigint;

    beforeEach(async function () {
      await botInsure.createPool("BOT Security Test Pool", "biBOT-SEC", "biBOTS");
      poolId = 1n;
      await botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(50_000));

      await botInsure.createProduct({
        name: "Security Test Product",
        description: "Security testing",
        productType: 0,
        minCoverage: parseBOT(100),
        maxCoverage: parseBOT(5_000),
        premiumRate: 500,
        maxDuration: 30 * 86400,
        payoutBps: 10_000,
        poolId: poolId,
        oracleFeedId: PRICE_FEED_ID,
        triggerType: 0,
        triggerValue: TRIGGER_BOT_PRICE,
      });
      productId = 1n;
    });

    it("EDGE CASE 1: A user cannot claim twice", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);
      await botOracle.setPrice(PRICE_FEED_ID, 65_000_000);
      await botInsure.connect(user1).settleClaim(1n);

      await expect(
        botInsure.connect(user1).settleClaim(1n)
      ).to.be.revertedWith("BotInsure: policy already claimed");
    });

    it("EDGE CASE 2: A user cannot claim someone else's policy", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);
      await botOracle.setPrice(PRICE_FEED_ID, 65_000_000);

      await expect(
        botInsure.connect(unauthorized).settleClaim(1n)
      ).to.be.revertedWith("BotInsure: caller is not policy holder");
    });

    it("EDGE CASE 3: A policy cannot be triggered twice", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);
      await botOracle.setPrice(PRICE_FEED_ID, 65_000_000);
      await botInsure.connect(user1).activateTrigger(1n);

      await expect(
        botInsure.connect(user1).activateTrigger(1n)
      ).to.be.revertedWith("BotInsure: policy not active");
    });

    it("EDGE CASE 4: Stale oracle cannot activate a claim", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);

      // Fast forward time past maxOracleAge (3600 seconds)
      await time.increase(4000);

      // Even if price was below trigger, stale timestamp must reject trigger!
      await botOracle.setFeed(PRICE_FEED_ID, 60_000_000, (await time.latest()) - 4000, 2, 8);

      const [eligible, reason] = await botInsure.checkPolicyTrigger(1n);
      expect(eligible).to.be.false;
      expect(reason).to.equal("Oracle price is stale");

      await expect(
        botInsure.connect(user1).activateTrigger(1n)
      ).to.be.revertedWith("BotInsure trigger not eligible: Oracle price is stale");
    });

    it("EDGE CASE 5: Zero oracle price cannot activate a claim", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);

      await botOracle.setFeed(PRICE_FEED_ID, 0, await time.latest(), 3, 8);
      const [eligible, reason] = await botInsure.checkPolicyTrigger(1n);
      expect(eligible).to.be.false;
      expect(reason).to.equal("Oracle price must be positive");
    });

    it("EDGE CASE 6: Negative oracle price cannot activate a claim", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);

      await botOracle.setFeed(PRICE_FEED_ID, -100, await time.latest(), 4, 8);
      const [eligible, reason] = await botInsure.checkPolicyTrigger(1n);
      expect(eligible).to.be.false;
      expect(reason).to.equal("Oracle price must be positive");
    });

    it("EDGE CASE 7: A user cannot buy protection above max coverage", async function () {
      // Max coverage is 5,000 BOT
      await expect(
        botInsure.connect(user1).buyProtection(productId, parseBOT(6_000), 30 * 86400, ethers.ZeroAddress)
      ).to.be.revertedWith("BotInsure: coverage exceeds maximum");
    });

    it("EDGE CASE 8: A user cannot withdraw more pool liquidity than they own", async function () {
      await expect(
        botInsure.connect(user1).withdrawLiquidity(poolId, parseBOT(1_000))
      ).to.be.revertedWith("BotInsure: insufficient share balance");
    });

    it("EDGE CASE 9: Claim window expiry prevents claiming", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);
      await botOracle.setPrice(PRICE_FEED_ID, 65_000_000);
      await botInsure.connect(user1).activateTrigger(1n);

      // Claim window is 7 days. Fast forward 8 days!
      await time.increase(8 * 86400);

      await expect(
        botInsure.connect(user1).settleClaim(1n)
      ).to.be.revertedWith("BotInsure: claim window expired");
    });

    it("EDGE CASE 10: Protocol pause prevents new purchases and deposits", async function () {
      await botInsure.pause();

      await expect(
        botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(1_000))
      ).to.be.revertedWithCustomError(botInsure, "EnforcedPause");

      await expect(
        botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(botInsure, "EnforcedPause");

      // Unpause and verify operation resumes
      await botInsure.unpause();
      await expect(
        botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(1_000))
      ).to.not.be.reverted;
    });

    it("EDGE CASE 11: Zero coverage amount is rejected", async function () {
      await expect(
        botInsure.connect(user1).buyProtection(productId, 0n, 30 * 86400, ethers.ZeroAddress)
      ).to.be.revertedWith("BotInsure: coverage below minimum");
    });

    it("EDGE CASE 12: Duration below minimum is rejected", async function () {
      await expect(
        botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 3600, ethers.ZeroAddress) // 1 hour < 1 day
      ).to.be.revertedWith("BotInsure: duration below minimum");
    });
  });

  describe("7. Protocol Administration & Statistics", function () {
    let poolId: bigint;
    let productId: bigint;

    beforeEach(async function () {
      await botInsure.createPool("Admin Test Pool", "biBOT-ADM", "biBOTA");
      poolId = 1n;
      await botInsure.connect(lp1).provideLiquidity(poolId, parseBOT(20_000));

      await botInsure.createProduct({
        name: "Admin Test Product",
        description: "Admin testing",
        productType: 0,
        minCoverage: parseBOT(100),
        maxCoverage: parseBOT(5_000),
        premiumRate: 500,
        maxDuration: 30 * 86400,
        payoutBps: 10_000,
        poolId: poolId,
        oracleFeedId: PRICE_FEED_ID,
        triggerType: 0,
        triggerValue: TRIGGER_BOT_PRICE,
      });
      productId = 1n;
    });

    it("Should reject unauthorized parameter changes", async function () {
      await expect(
        botInsure.connect(unauthorized).setProtocolFeeBps(1000)
      ).to.be.reverted;

      await expect(
        botInsure.connect(unauthorized).setClaimWindowDuration(14 * 86400)
      ).to.be.reverted;

      await expect(
        botInsure.connect(unauthorized).setBotOracle(unauthorized.address, 7200)
      ).to.be.reverted;
    });

    it("Should allow authorized admin to update risk parameters and oracle", async function () {
      await expect(botInsure.setProtocolFeeBps(800))
        .to.emit(botInsure, "ProtocolFeeUpdated")
        .withArgs(800);

      await expect(botInsure.setClaimWindowDuration(10 * 86400))
        .to.emit(botInsure, "ClaimWindowUpdated")
        .withArgs(10 * 86400);

      const risk = await botInsure.getRiskParameters();
      expect(risk.protocolFeeBps).to.equal(800n);
      expect(risk.claimWindowDuration).to.equal(10n * 86400n);

      const oracleConfig = await botInsure.getOracleConfig();
      expect(oracleConfig.oracleAddress).to.equal(await botOracle.getAddress());
      expect(oracleConfig.botLendAddress).to.equal(await botLend.getAddress());
    });

    it("Should return correct protocol stats and user policy list", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);
      await botInsure.connect(user1).buyProtection(productId, parseBOT(500), 15 * 86400, ethers.ZeroAddress);

      const userPolList = await botInsure.getUserPolicies(user1.address);
      expect(userPolList.length).to.equal(2);
      expect(userPolList[0]).to.equal(1n);
      expect(userPolList[1]).to.equal(2n);

      const stats = await botInsure.getProtocolStats();
      expect(stats.totalActivePolicies).to.equal(2n);
      expect(stats.poolCount).to.equal(1n);
      expect(stats.productCount).to.equal(1n);
      expect(stats.totalPoliciesCount).to.equal(2n);
      expect(stats.totalPoolLiquidity).to.equal(parseBOT(20_000));
    });

    it("Should unlock pool locked coverage when expirePolicy is called", async function () {
      await botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);

      let poolStats = await botInsure.getPoolStats(poolId);
      expect(poolStats.lockedCoverage).to.equal(parseBOT(1_000));

      // Fast forward past policy expiry
      await time.increase(31 * 86400);

      // Verify dynamic status shows EXPIRED
      const pol = await botInsure.getPolicy(1n);
      expect(pol.status).to.equal(4); // EXPIRED

      // Call expirePolicy
      await expect(botInsure.expirePolicy(1n))
        .to.emit(botInsure, "PolicyExpired")
        .withArgs(1n);

      poolStats = await botInsure.getPoolStats(poolId);
      expect(poolStats.lockedCoverage).to.equal(0n);
      expect(poolStats.activePolicies).to.equal(0n);
    });

    it("Should prevent purchase when product is deactivated", async function () {
      await botInsure.updateProduct(productId, false, parseBOT(100), parseBOT(5_000), 500, TRIGGER_BOT_PRICE);
      await expect(
        botInsure.connect(user1).buyProtection(productId, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress)
      ).to.be.revertedWith("BotInsure: product not active");
    });

    it("Should prevent purchase when coverage exceeds pool available liquidity", async function () {
      // Pool has 20,000 BOT available.
      // Update product max coverage to 30,000 BOT
      await botInsure.updateProduct(productId, true, parseBOT(100), parseBOT(30_000), 500, TRIGGER_BOT_PRICE);
      // Attempting to buy 25,000 BOT coverage must revert because available liquidity is only 20,000!
      await expect(
        botInsure.connect(user1).buyProtection(productId, parseBOT(25_000), 30 * 86400, ethers.ZeroAddress)
      ).to.be.revertedWith("BotInsure: insufficient pool available liquidity");
    });

    it("Should correctly accrue premium value to existing liquidity providers", async function () {
      // LP1 deposited 20,000 BOT and received 20,000 shares
      const initialLP1Balance = await botInsure.getUserLiquidity(lp1.address, poolId);
      expect(initialLP1Balance[1]).to.equal(parseBOT(20_000));

      // User buys protection and pays premium into the pool
      await botInsure.connect(user1).buyProtection(productId, parseBOT(2_000), 30 * 86400, ethers.ZeroAddress);

      // Now pool net assets increased by the pool's share of premium!
      const afterPremiumLP1Balance = await botInsure.getUserLiquidity(lp1.address, poolId);
      expect(afterPremiumLP1Balance[1]).to.be.greaterThan(parseBOT(20_000));
    });

    it("Should strictly reject direct unauthorized minting or burning on BotInsurePoolToken", async function () {
      const pool = await botInsure.getPool(poolId);
      const shareToken = BotInsurePoolToken__factory.connect(pool.shareToken, unauthorized);

      await expect(
        shareToken.mint(unauthorized.address, parseBOT(1_000))
      ).to.be.reverted;

      await expect(
        shareToken.burn(lp1.address, parseBOT(1_000))
      ).to.be.reverted;
    });

    it("Should cap claim payout if it exceeds pool net assets", async function () {
      // Create a small pool with 1,000 BOT
      const smallPoolId = 2n;
      await botInsure.createPool("Small Test Pool", "biBOT-SM", "biBOTS");
      await botInsure.connect(lp1).provideLiquidity(smallPoolId, parseBOT(1_000));

      await botInsure.createProduct({
        name: "Small Pool Product",
        description: "Testing cap",
        productType: 0,
        minCoverage: parseBOT(100),
        maxCoverage: parseBOT(1_000),
        premiumRate: 500,
        maxDuration: 30 * 86400,
        payoutBps: 10_000,
        poolId: smallPoolId,
        oracleFeedId: PRICE_FEED_ID,
        triggerType: 0,
        triggerValue: TRIGGER_BOT_PRICE,
      });

      await botInsure.connect(user1).buyProtection(2n, parseBOT(1_000), 30 * 86400, ethers.ZeroAddress);
      const policyId = await botInsure.policyCount();
      await botOracle.setPrice(PRICE_FEED_ID, 65_000_000);

      // Settle claim: user receives available pool net assets (capped safely)
      const userBalBefore = await botToken.balanceOf(user1.address);
      await botInsure.connect(user1).settleClaim(policyId);
      const userBalAfter = await botToken.balanceOf(user1.address);

      expect(userBalAfter - userBalBefore).to.be.greaterThan(0);
      const pol = await botInsure.getPolicy(policyId);
      expect(pol.claimed).to.be.true;
    });
  });
});
