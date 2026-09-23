// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IBotInsure.sol";
import "../interfaces/IBotOracle.sol";
import "../interfaces/IBotLend.sol";
import "../interfaces/IBotInsurePoolTokenFactory.sol";

/**
 * @title BotInsure
 * @notice Decentralized Parametric Protection Protocol for the Botchain ecosystem.
 * Enforces automated, code-driven parametric underwriting, pool liquidity shares,
 * transparent fixed-point pricing, and oracle-driven claims settlement.
 */
contract BotInsure is IBotInsure, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Roles definition
    bytes32 public constant PRODUCT_MANAGER_ROLE = keccak256("PRODUCT_MANAGER_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Math Constants
    uint256 public constant BPS_DIVISOR = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Underlying currency (BOT token)
    IERC20 public immutable botToken;

    // External Protocol Integrations
    IBotOracle public botOracle;
    uint256 public maxOracleAge; // Maximum allowed age for oracle data in seconds
    IBotLend public botLend;

    // Protocol Treasury & Risk Config
    address public treasury;
    uint256 public protocolFeeBps; // e.g. 500 = 5%
    uint256 public claimWindowDuration; // e.g. 7 days
    uint256 public minDuration; // e.g. 1 day
    uint256 public maxDuration; // e.g. 365 days

    // Pools & Products
    mapping(uint256 => ProtectionPool) public pools;
    uint256 public poolCount;

    mapping(uint256 => ProtectionProduct) public products;
    uint256 public productCount;

    // Policies
    mapping(uint256 => Policy) public policies;
    uint256 public policyCount;

    mapping(address => uint256[]) private _userPolicies;

    // Global Protocol Statistics
    uint256 public totalPoolLiquidity;
    uint256 public totalActivePolicies;
    uint256 public totalPremiumsCollected;
    uint256 public totalClaimsPaid;
    IBotInsurePoolTokenFactory public immutable tokenFactory;

    constructor(
        address _botToken,
        address _botOracle,
        address _botLend,
        address _treasury,
        address _tokenFactory
    ) {
        require(_botToken != address(0), "BotInsure: zero botToken address");
        require(_treasury != address(0), "BotInsure: zero treasury address");
        require(_tokenFactory != address(0), "BotInsure: zero tokenFactory address");

        botToken = IERC20(_botToken);
        botOracle = IBotOracle(_botOracle);
        botLend = IBotLend(_botLend);
        treasury = _treasury;
        tokenFactory = IBotInsurePoolTokenFactory(_tokenFactory);

        // Default configurations
        maxOracleAge = 3600; // 1 hour
        protocolFeeBps = 500; // 5%
        claimWindowDuration = 7 days;
        minDuration = 1 days;
        maxDuration = 365 days;

        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRODUCT_MANAGER_ROLE, msg.sender);
        _grantRole(POOL_MANAGER_ROLE, msg.sender);
        _grantRole(ORACLE_MANAGER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // =========================================================================
    // PRODUCT MANAGEMENT
    // =========================================================================

    /**
     * @notice Create a new parametric protection product.
     */
    /**
     * @notice Create a new parametric protection product using CreateProductParams.
     */
    function createProduct(CreateProductParams calldata params)
        external
        onlyRole(PRODUCT_MANAGER_ROLE)
        returns (uint256)
    {
        require(bytes(params.name).length > 0, "BotInsure: empty name");
        require(params.minCoverage > 0 && params.maxCoverage >= params.minCoverage, "BotInsure: invalid coverage limits");
        require(params.premiumRate > 0 && params.premiumRate <= BPS_DIVISOR, "BotInsure: invalid premium rate");
        require(params.maxDuration >= minDuration && params.maxDuration <= maxDuration, "BotInsure: invalid max duration");
        require(params.payoutBps > 0 && params.payoutBps <= BPS_DIVISOR, "BotInsure: invalid payoutBps");
        require(params.poolId > 0 && params.poolId <= poolCount, "BotInsure: non-existent pool");
        require(pools[params.poolId].active, "BotInsure: pool is not active");

        productCount++;
        uint256 productId = productCount;

        ProtectionProduct storage prod = products[productId];
        prod.id = productId;
        prod.name = params.name;
        prod.description = params.description;
        prod.productType = params.productType;
        prod.active = true;
        prod.minCoverage = params.minCoverage;
        prod.maxCoverage = params.maxCoverage;
        prod.premiumRate = params.premiumRate;
        prod.maxDuration = params.maxDuration;
        prod.payoutBps = params.payoutBps;
        prod.poolId = params.poolId;
        prod.oracleFeedId = params.oracleFeedId;
        prod.triggerType = params.triggerType;
        prod.triggerValue = params.triggerValue;
        prod.createdAt = block.timestamp;

        emit ProtectionProductCreated(productId, params.name, params.productType, params.poolId);
        return productId;
    }

    /**
     * @notice Update an existing protection product.
     */
    function updateProduct(
        uint256 productId,
        bool active,
        uint256 minCoverage,
        uint256 maxCoverage,
        uint256 premiumRate,
        uint256 triggerValue
    ) external onlyRole(PRODUCT_MANAGER_ROLE) {
        require(productId > 0 && productId <= productCount, "BotInsure: non-existent product");
        require(minCoverage > 0 && maxCoverage >= minCoverage, "BotInsure: invalid coverage limits");
        require(premiumRate > 0 && premiumRate <= BPS_DIVISOR, "BotInsure: invalid premium rate");

        ProtectionProduct storage prod = products[productId];
        prod.active = active;
        prod.minCoverage = minCoverage;
        prod.maxCoverage = maxCoverage;
        prod.premiumRate = premiumRate;
        prod.triggerValue = triggerValue;

        emit ProtectionProductUpdated(productId, active, premiumRate, triggerValue);
    }

    // =========================================================================
    // POOL MANAGEMENT & LIQUIDITY
    // =========================================================================

    /**
     * @notice Create a new protection pool with its dedicated ERC20 share token.
     */
    function createPool(
        string memory name,
        string memory shareTokenName,
        string memory shareTokenSymbol
    ) external onlyRole(POOL_MANAGER_ROLE) returns (uint256) {
        require(bytes(name).length > 0, "BotInsure: empty name");

        poolCount++;
        uint256 poolId = poolCount;

        // Deploy dedicated ERC20 share token via factory
        address shareToken = tokenFactory.createShareToken(
            shareTokenName,
            shareTokenSymbol,
            poolId,
            address(this)
        );

        pools[poolId] = ProtectionPool({
            id: poolId,
            name: name,
            shareToken: shareToken,
            totalDeposited: 0,
            totalPremiumsCollected: 0,
            totalClaimsPaid: 0,
            lockedCoverage: 0,
            activePoliciesCount: 0,
            active: true
        });

        emit PoolCreated(poolId, name, shareToken);
        return poolId;
    }

    /**
     * @notice Set pool active status.
     */
    function setPoolActive(uint256 poolId, bool active) external onlyRole(POOL_MANAGER_ROLE) {
        require(poolId > 0 && poolId <= poolCount, "BotInsure: non-existent pool");
        pools[poolId].active = active;
    }

    /**
     * @notice Deposit BOT into a protection pool to receive proportional pool shares.
     * @param poolId Identifier of the protection pool
     * @param amount Amount of BOT tokens to deposit
     */
    function provideLiquidity(uint256 poolId, uint256 amount)
        external
        override
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        require(poolId > 0 && poolId <= poolCount, "BotInsure: invalid poolId");
        ProtectionPool storage pool = pools[poolId];
        require(pool.active, "BotInsure: pool inactive");
        require(amount > 0, "BotInsure: amount must be > 0");

        IBotInsurePoolToken shareToken = IBotInsurePoolToken(pool.shareToken);
        uint256 totalShares = shareToken.totalSupply();
        uint256 currentPoolBalance = _getPoolNetAssets(poolId);

        if (totalShares == 0 || currentPoolBalance == 0) {
            shares = amount;
        } else {
            shares = (amount * totalShares) / currentPoolBalance;
        }
        require(shares > 0, "BotInsure: zero shares minted");

        // Transfer BOT from provider
        botToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update pool state
        pool.totalDeposited += amount;
        totalPoolLiquidity += amount;

        // Mint shares
        shareToken.mint(msg.sender, shares);

        emit LiquidityProvided(poolId, msg.sender, amount, shares);
        return shares;
    }

    /**
     * @notice Withdraw liquidity by burning pool shares.
     * Strictly verifies that remaining liquidity satisfies locked policy obligations.
     * @param poolId Identifier of the protection pool
     * @param shares Amount of pool shares to burn
     */
    function withdrawLiquidity(uint256 poolId, uint256 shares)
        external
        override
        nonReentrant
        returns (uint256 amount)
    {
        require(poolId > 0 && poolId <= poolCount, "BotInsure: invalid poolId");
        require(shares > 0, "BotInsure: shares must be > 0");
        ProtectionPool storage pool = pools[poolId];

        IBotInsurePoolToken shareToken = IBotInsurePoolToken(pool.shareToken);
        require(shareToken.balanceOf(msg.sender) >= shares, "BotInsure: insufficient share balance");

        uint256 totalShares = shareToken.totalSupply();
        uint256 currentPoolBalance = _getPoolNetAssets(poolId);

        amount = (shares * currentPoolBalance) / totalShares;
        require(amount > 0, "BotInsure: zero withdraw amount");

        // Protect locked coverage needed for active policies and valid claims
        require(
            currentPoolBalance - amount >= pool.lockedCoverage,
            "BotInsure: cannot drain required active coverage"
        );

        // Burn shares
        shareToken.burn(msg.sender, shares);

        // Adjust pool state
        if (pool.totalDeposited >= amount) {
            pool.totalDeposited -= amount;
        } else {
            pool.totalDeposited = 0;
        }

        if (totalPoolLiquidity >= amount) {
            totalPoolLiquidity -= amount;
        } else {
            totalPoolLiquidity = 0;
        }

        // Transfer BOT to provider
        botToken.safeTransfer(msg.sender, amount);

        emit LiquidityWithdrawn(poolId, msg.sender, amount, shares);
        return amount;
    }

    // =========================================================================
    // POLICY PURCHASE
    // =========================================================================

    /**
     * @notice Purchase a parametric protection policy.
     * @param productId Protection product ID
     * @param coverageAmount Requested coverage in BOT
     * @param duration Policy duration in seconds
     * @param referenceId Optional reference address (e.g. user address for BotLend)
     */
    function buyProtection(
        uint256 productId,
        uint256 coverageAmount,
        uint256 duration,
        address referenceId
    ) external override whenNotPaused nonReentrant returns (uint256 policyId) {
        require(productId > 0 && productId <= productCount, "BotInsure: non-existent product");
        ProtectionProduct memory prod = products[productId];
        require(prod.active, "BotInsure: product not active");
        require(coverageAmount >= prod.minCoverage, "BotInsure: coverage below minimum");
        require(coverageAmount <= prod.maxCoverage, "BotInsure: coverage exceeds maximum");
        require(duration >= minDuration, "BotInsure: duration below minimum");
        require(duration <= prod.maxDuration, "BotInsure: duration exceeds maximum");

        ProtectionPool storage pool = pools[prod.poolId];
        require(pool.active, "BotInsure: pool not active");

        // Check available pool liquidity
        uint256 availableLiquidity = getAvailablePoolLiquidity(prod.poolId);
        require(availableLiquidity >= coverageAmount, "BotInsure: insufficient pool available liquidity");

        // Calculate premium strictly on-chain
        (uint256 totalPremium, uint256 protocolFee, uint256 poolPremium) = getPremium(
            productId,
            coverageAmount,
            duration
        );
        require(totalPremium > 0, "BotInsure: premium calculated to 0");

        // Transfer premium from buyer to contract
        botToken.safeTransferFrom(msg.sender, address(this), totalPremium);

        // Disburse protocol fee to treasury if configured
        if (protocolFee > 0 && treasury != address(0)) {
            botToken.safeTransfer(treasury, protocolFee);
        }

        // Update pool accounting
        pool.totalPremiumsCollected += poolPremium;
        pool.lockedCoverage += coverageAmount;
        pool.activePoliciesCount++;

        // Update global statistics
        totalPremiumsCollected += totalPremium;
        totalActivePolicies++;

        // Record policy
        policyCount++;
        policyId = policyCount;

        policies[policyId].policyId = policyId;
        policies[policyId].holder = msg.sender;
        policies[policyId].poolId = prod.poolId;
        policies[policyId].productId = productId;
        policies[policyId].productType = prod.productType;
        policies[policyId].coverageAmount = coverageAmount;
        policies[policyId].premiumPaid = totalPremium;
        policies[policyId].triggerValue = prod.triggerValue;
        policies[policyId].startTime = block.timestamp;
        policies[policyId].expiryTime = block.timestamp + duration;
        policies[policyId].createdAt = block.timestamp;
        policies[policyId].status = PolicyStatus.ACTIVE;
        policies[policyId].claimed = false;
        policies[policyId].claimAmount = 0;
        policies[policyId].claimTime = 0;
        policies[policyId].oracleFeedId = prod.oracleFeedId;
        policies[policyId].referenceId = referenceId == address(0) ? msg.sender : referenceId;
        policies[policyId].claimDeadline = 0;

        _userPolicies[msg.sender].push(policyId);

        emit PolicyPurchased(
            policyId,
            msg.sender,
            productId,
            prod.poolId,
            coverageAmount,
            totalPremium,
            block.timestamp + duration
        );

        return policyId;
    }

    // =========================================================================
    // TRIGGER CHECKING & ACTIVATION
    // =========================================================================

    /**
     * @notice Check whether a policy's trigger condition is met right now.
     */
    function checkPolicyTrigger(uint256 policyId)
        public
        view
        override
        returns (bool isEligible, string memory reason)
    {
        if (policyId == 0 || policyId > policyCount) {
            return (false, "Policy does not exist");
        }
        Policy memory pol = policies[policyId];

        if (pol.status == PolicyStatus.CLAIMED) {
            return (false, "Policy already claimed");
        }
        if (pol.status == PolicyStatus.CANCELLED) {
            return (false, "Policy is cancelled");
        }
        if (pol.status == PolicyStatus.TRIGGERED || pol.status == PolicyStatus.CLAIMABLE) {
            if (block.timestamp <= pol.claimDeadline) {
                return (true, "Policy already triggered and within claim window");
            } else {
                return (false, "Claim window expired");
            }
        }
        if (block.timestamp > pol.expiryTime) {
            return (false, "Policy expired");
        }

        // Product checks
        ProtectionProduct memory prod = products[pol.productId];
        if (prod.triggerType == TriggerType.PRICE_BELOW) {
            if (address(botOracle) == address(0)) {
                return (false, "BotOracle address not configured");
            }
            (int256 answer, uint256 updatedAt, ) = botOracle.getLatestAnswer(prod.oracleFeedId);
            if (answer <= 0) {
                return (false, "Oracle price must be positive");
            }
            if (updatedAt == 0 || block.timestamp < updatedAt || block.timestamp - updatedAt > maxOracleAge) {
                return (false, "Oracle price is stale");
            }
            if (uint256(answer) <= pol.triggerValue) {
                return (true, "Oracle price met trigger threshold");
            } else {
                return (false, "Oracle price above trigger threshold");
            }
        } else if (prod.triggerType == TriggerType.HEALTH_FACTOR_BELOW) {
            if (address(botLend) == address(0)) {
                return (false, "BotLend address not configured");
            }
            uint256 healthFactor = botLend.getHealthFactor(pol.referenceId);
            if (healthFactor == 0) {
                return (false, "Invalid health factor returned");
            }
            if (healthFactor < pol.triggerValue) {
                return (true, "BotLend health factor below trigger threshold");
            } else {
                return (false, "BotLend position healthy");
            }
        }

        return (false, "Unknown trigger type");
    }

    /**
     * @notice Activate trigger for an active policy if condition is satisfied.
     */
    function activateTrigger(uint256 policyId) public override whenNotPaused {
        require(policyId > 0 && policyId <= policyCount, "BotInsure: non-existent policy");
        Policy storage pol = policies[policyId];
        require(pol.status == PolicyStatus.ACTIVE, "BotInsure: policy not active");
        require(block.timestamp <= pol.expiryTime, "BotInsure: policy has expired");
        require(!pol.claimed, "BotInsure: already claimed");

        (bool eligible, string memory reason) = checkPolicyTrigger(policyId);
        require(eligible, string(abi.encodePacked("BotInsure trigger not eligible: ", reason)));

        pol.status = PolicyStatus.TRIGGERED;
        pol.claimTime = block.timestamp;
        pol.claimDeadline = block.timestamp + claimWindowDuration;

        emit PolicyTriggered(policyId, msg.sender, block.timestamp, pol.claimDeadline);
    }

    // =========================================================================
    // CLAIMS & SETTLEMENT
    // =========================================================================

    /**
     * @notice Submit a claim for a triggered policy.
     */
    function submitClaim(uint256 policyId) external override returns (uint256 payout) {
        return settleClaim(policyId);
    }

    /**
     * @notice Settle and disburse parametric claim payout.
     * Enforces strict reentrancy protection, checks-effects-interactions, and payout capping.
     */
    function settleClaim(uint256 policyId) public override nonReentrant returns (uint256 payout) {
        require(policyId > 0 && policyId <= policyCount, "BotInsure: non-existent policy");
        Policy storage pol = policies[policyId];
        require(msg.sender == pol.holder, "BotInsure: caller is not policy holder");
        require(!pol.claimed, "BotInsure: policy already claimed");

        // If not yet triggered, allow auto-activation if trigger condition is currently satisfied
        if (pol.status == PolicyStatus.ACTIVE) {
            activateTrigger(policyId);
        }

        require(
            pol.status == PolicyStatus.TRIGGERED || pol.status == PolicyStatus.CLAIMABLE,
            "BotInsure: policy not triggered"
        );
        require(block.timestamp <= pol.claimDeadline, "BotInsure: claim window expired");

        ProtectionProduct memory prod = products[pol.productId];
        ProtectionPool storage pool = pools[pol.poolId];

        // Deterministic claim payout calculation
        payout = (pol.coverageAmount * prod.payoutBps) / BPS_DIVISOR;

        // Cap payout by pool available liquidity
        uint256 poolNet = _getPoolNetAssets(pol.poolId);
        if (payout > poolNet) {
            payout = poolNet;
        }
        require(payout > 0, "BotInsure: zero payout available");

        // State changes before external transfer
        pol.claimed = true;
        pol.status = PolicyStatus.CLAIMED;
        pol.claimAmount = payout;

        // Pool accounting adjustments
        if (pool.lockedCoverage >= pol.coverageAmount) {
            pool.lockedCoverage -= pol.coverageAmount;
        } else {
            pool.lockedCoverage = 0;
        }

        if (pool.activePoliciesCount > 0) {
            pool.activePoliciesCount--;
        }
        pool.totalClaimsPaid += payout;

        // Global stats adjustments
        if (totalActivePolicies > 0) {
            totalActivePolicies--;
        }
        totalClaimsPaid += payout;

        emit ClaimSubmitted(policyId, pol.holder, payout);
        emit ClaimSettled(policyId, pol.holder, payout);

        // Safe token transfer to policy holder
        botToken.safeTransfer(pol.holder, payout);

        return payout;
    }

    /**
     * @notice Clean up an expired policy to unlock pool coverage if trigger was never activated.
     */
    function expirePolicy(uint256 policyId) external {
        require(policyId > 0 && policyId <= policyCount, "BotInsure: non-existent policy");
        Policy storage pol = policies[policyId];

        if (pol.status == PolicyStatus.ACTIVE && block.timestamp > pol.expiryTime) {
            pol.status = PolicyStatus.EXPIRED;
            ProtectionPool storage pool = pools[pol.poolId];
            if (pool.lockedCoverage >= pol.coverageAmount) {
                pool.lockedCoverage -= pol.coverageAmount;
            } else {
                pool.lockedCoverage = 0;
            }
            if (pool.activePoliciesCount > 0) {
                pool.activePoliciesCount--;
            }
            if (totalActivePolicies > 0) {
                totalActivePolicies--;
            }
            emit PolicyExpired(policyId);
        }
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    function getProduct(uint256 productId) external view override returns (ProtectionProduct memory) {
        require(productId > 0 && productId <= productCount, "BotInsure: non-existent product");
        return products[productId];
    }

    function getPool(uint256 poolId) external view override returns (ProtectionPool memory) {
        require(poolId > 0 && poolId <= poolCount, "BotInsure: non-existent pool");
        return pools[poolId];
    }

    function getPolicy(uint256 policyId) external view override returns (Policy memory pol) {
        require(policyId > 0 && policyId <= policyCount, "BotInsure: non-existent policy");
        pol = policies[policyId];
        // Dynamic status check for display
        if (pol.status == PolicyStatus.ACTIVE && block.timestamp > pol.expiryTime) {
            pol.status = PolicyStatus.EXPIRED;
        } else if (pol.status == PolicyStatus.TRIGGERED && block.timestamp > pol.claimDeadline) {
            pol.status = PolicyStatus.EXPIRED;
        }
    }

    function getUserPolicies(address user) external view override returns (uint256[] memory) {
        return _userPolicies[user];
    }

    function getUserLiquidity(address user, uint256 poolId)
        external
        view
        override
        returns (uint256 shares, uint256 botAmount)
    {
        if (poolId == 0 || poolId > poolCount) return (0, 0);
        ProtectionPool memory pool = pools[poolId];
        IBotInsurePoolToken shareToken = IBotInsurePoolToken(pool.shareToken);
        shares = shareToken.balanceOf(user);
        uint256 totalShares = shareToken.totalSupply();
        if (totalShares == 0 || shares == 0) {
            return (shares, 0);
        }
        uint256 poolNet = _getPoolNetAssets(poolId);
        botAmount = (shares * poolNet) / totalShares;
    }

    function getPoolStats(uint256 poolId)
        external
        view
        override
        returns (
            uint256 totalLiquidity,
            uint256 availableLiquidity,
            uint256 activePolicies,
            uint256 premiumsCollected,
            uint256 claimsPaid,
            uint256 lockedCoverage
        )
    {
        if (poolId == 0 || poolId > poolCount) return (0, 0, 0, 0, 0, 0);
        ProtectionPool memory pool = pools[poolId];
        totalLiquidity = _getPoolNetAssets(poolId);
        availableLiquidity = getAvailablePoolLiquidity(poolId);
        activePolicies = pool.activePoliciesCount;
        premiumsCollected = pool.totalPremiumsCollected;
        claimsPaid = pool.totalClaimsPaid;
        lockedCoverage = pool.lockedCoverage;
    }

    function getAvailablePoolLiquidity(uint256 poolId) public view override returns (uint256) {
        if (poolId == 0 || poolId > poolCount) return 0;
        ProtectionPool memory pool = pools[poolId];
        uint256 netAssets = _getPoolNetAssets(poolId);
        if (netAssets <= pool.lockedCoverage) {
            return 0;
        }
        return netAssets - pool.lockedCoverage;
    }

    function getPremium(
        uint256 productId,
        uint256 coverageAmount,
        uint256 duration
    )
        public
        view
        override
        returns (
            uint256 totalPremium,
            uint256 protocolFee,
            uint256 poolPremium
        )
    {
        if (productId == 0 || productId > productCount) return (0, 0, 0);
        ProtectionProduct memory prod = products[productId];

        // Fixed-point calculation:
        // totalPremium = (coverageAmount * premiumRate * duration) / (BPS_DIVISOR * SECONDS_PER_YEAR)
        totalPremium = (coverageAmount * prod.premiumRate * duration) / (BPS_DIVISOR * SECONDS_PER_YEAR);
        if (totalPremium == 0 && coverageAmount > 0 && duration > 0) {
            totalPremium = 1; // Minimum 1 unit to avoid 0 premium edge case on tiny amounts
        }

        protocolFee = (totalPremium * protocolFeeBps) / BPS_DIVISOR;
        poolPremium = totalPremium - protocolFee;
    }

    function getClaimAmount(uint256 policyId) external view override returns (uint256) {
        if (policyId == 0 || policyId > policyCount) return 0;
        Policy memory pol = policies[policyId];
        if (pol.claimed) return pol.claimAmount;
        ProtectionProduct memory prod = products[pol.productId];
        uint256 payout = (pol.coverageAmount * prod.payoutBps) / BPS_DIVISOR;
        uint256 net = _getPoolNetAssets(pol.poolId);
        return payout > net ? net : payout;
    }

    function getProtocolStats() external view override returns (ProtocolStats memory) {
        uint256 totalAvailable = 0;
        for (uint256 i = 1; i <= poolCount; i++) {
            totalAvailable += getAvailablePoolLiquidity(i);
        }

        return ProtocolStats({
            totalPoolLiquidity: totalPoolLiquidity,
            totalActivePolicies: totalActivePolicies,
            totalPremiumsCollected: totalPremiumsCollected,
            totalClaimsPaid: totalClaimsPaid,
            totalAvailableLiquidity: totalAvailable,
            poolCount: poolCount,
            productCount: productCount,
            totalPoliciesCount: policyCount
        });
    }

    function getOracleConfig() external view override returns (OracleConfig memory) {
        return OracleConfig({
            oracleAddress: address(botOracle),
            maxOracleAge: maxOracleAge,
            botLendAddress: address(botLend)
        });
    }

    function getRiskParameters() external view override returns (RiskParameters memory) {
        return RiskParameters({
            protocolFeeBps: protocolFeeBps,
            claimWindowDuration: claimWindowDuration,
            minDuration: minDuration,
            maxDuration: maxDuration
        });
    }

    // =========================================================================
    // ADMIN & CONFIGURATION
    // =========================================================================

    function setBotOracle(address newOracle, uint256 newMaxOracleAge) external onlyRole(ORACLE_MANAGER_ROLE) {
        botOracle = IBotOracle(newOracle);
        maxOracleAge = newMaxOracleAge;
        emit OracleUpdated(newOracle, newMaxOracleAge);
    }

    function setBotLend(address newBotLend) external onlyRole(ORACLE_MANAGER_ROLE) {
        botLend = IBotLend(newBotLend);
        emit BotLendUpdated(newBotLend);
    }

    function setProtocolFeeBps(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 2000, "BotInsure: fee cannot exceed 20%");
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(newFeeBps);
    }

    function setClaimWindowDuration(uint256 newDuration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDuration >= 1 days && newDuration <= 30 days, "BotInsure: invalid claim window");
        claimWindowDuration = newDuration;
        emit ClaimWindowUpdated(newDuration);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "BotInsure: zero treasury");
        treasury = newTreasury;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /**
     * @dev Net assets of a pool = deposited + premiumsCollected - claimsPaid.
     */
    function _getPoolNetAssets(uint256 poolId) internal view returns (uint256) {
        ProtectionPool memory pool = pools[poolId];
        uint256 gross = pool.totalDeposited + pool.totalPremiumsCollected;
        if (gross <= pool.totalClaimsPaid) {
            return 0;
        }
        return gross - pool.totalClaimsPaid;
    }
}
