// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBotInsure {
    enum PolicyStatus {
        ACTIVE,
        TRIGGERED,
        CLAIMABLE,
        CLAIMED,
        EXPIRED,
        CANCELLED
    }

    enum ProductType {
        BOT_PRICE_PROTECTION,
        BOTLEND_LIQUIDATION_PROTECTION
    }

    enum TriggerType {
        PRICE_BELOW,
        HEALTH_FACTOR_BELOW
    }

    struct CreateProductParams {
        string name;
        string description;
        ProductType productType;
        uint256 minCoverage;
        uint256 maxCoverage;
        uint256 premiumRate;
        uint256 maxDuration;
        uint256 payoutBps;
        uint256 poolId;
        uint256 oracleFeedId;
        TriggerType triggerType;
        uint256 triggerValue;
    }

    struct ProtectionProduct {
        uint256 id;
        string name;
        string description;
        ProductType productType;
        bool active;
        uint256 minCoverage;
        uint256 maxCoverage;
        uint256 premiumRate; // annual rate in bps (e.g. 500 = 5% per year)
        uint256 maxDuration; // in seconds (e.g. 365 days)
        uint256 payoutBps; // payout percentage of coverage (e.g. 10000 = 100%)
        uint256 poolId;
        uint256 oracleFeedId;
        TriggerType triggerType;
        uint256 triggerValue; // e.g. price threshold or health factor threshold
        uint256 createdAt;
    }

    struct ProtectionPool {
        uint256 id;
        string name;
        address shareToken;
        uint256 totalDeposited;
        uint256 totalPremiumsCollected;
        uint256 totalClaimsPaid;
        uint256 lockedCoverage;
        uint256 activePoliciesCount;
        bool active;
    }

    struct Policy {
        uint256 policyId;
        address holder;
        uint256 poolId;
        uint256 productId;
        ProductType productType;
        uint256 coverageAmount;
        uint256 premiumPaid;
        uint256 triggerValue;
        uint256 startTime;
        uint256 expiryTime;
        uint256 createdAt;
        PolicyStatus status;
        bool claimed;
        uint256 claimAmount;
        uint256 claimTime;
        uint256 oracleFeedId;
        address referenceId; // User address or contract address referenced
        uint256 claimDeadline; // Expiry of claim window after trigger
    }

    struct ProtocolStats {
        uint256 totalPoolLiquidity;
        uint256 totalActivePolicies;
        uint256 totalPremiumsCollected;
        uint256 totalClaimsPaid;
        uint256 totalAvailableLiquidity;
        uint256 poolCount;
        uint256 productCount;
        uint256 totalPoliciesCount;
    }

    struct OracleConfig {
        address oracleAddress;
        uint256 maxOracleAge;
        address botLendAddress;
    }

    struct RiskParameters {
        uint256 protocolFeeBps; // e.g. 500 = 5%
        uint256 claimWindowDuration; // e.g. 7 days in seconds
        uint256 minDuration; // e.g. 1 day
        uint256 maxDuration; // e.g. 365 days
    }

    // Events
    event ProtectionProductCreated(uint256 indexed productId, string name, ProductType productType, uint256 poolId);
    event ProtectionProductUpdated(uint256 indexed productId, bool active, uint256 premiumRate, uint256 triggerValue);
    event PoolCreated(uint256 indexed poolId, string name, address shareToken);
    event LiquidityProvided(uint256 indexed poolId, address indexed provider, uint256 amount, uint256 sharesMinted);
    event LiquidityWithdrawn(uint256 indexed poolId, address indexed provider, uint256 amount, uint256 sharesBurned);
    event PolicyPurchased(
        uint256 indexed policyId,
        address indexed holder,
        uint256 indexed productId,
        uint256 poolId,
        uint256 coverageAmount,
        uint256 premiumPaid,
        uint256 expiryTime
    );
    event PolicyTriggered(uint256 indexed policyId, address indexed triggerCaller, uint256 triggerTime, uint256 claimDeadline);
    event ClaimSubmitted(uint256 indexed policyId, address indexed holder, uint256 claimAmount);
    event ClaimSettled(uint256 indexed policyId, address indexed holder, uint256 payoutAmount);
    event PolicyExpired(uint256 indexed policyId);
    event OracleUpdated(address indexed newOracle, uint256 maxOracleAge);
    event BotLendUpdated(address indexed newBotLend);
    event ProtocolFeeUpdated(uint256 newFeeBps);
    event ClaimWindowUpdated(uint256 newClaimWindowDuration);

    // External functions
    function buyProtection(
        uint256 productId,
        uint256 coverageAmount,
        uint256 duration,
        address referenceId
    ) external returns (uint256 policyId);

    function provideLiquidity(uint256 poolId, uint256 amount) external returns (uint256 shares);

    function withdrawLiquidity(uint256 poolId, uint256 shares) external returns (uint256 amount);

    function activateTrigger(uint256 policyId) external;

    function submitClaim(uint256 policyId) external returns (uint256 payout);

    function settleClaim(uint256 policyId) external returns (uint256 payout);

    // View functions
    function getProduct(uint256 productId) external view returns (ProtectionProduct memory);

    function getPool(uint256 poolId) external view returns (ProtectionPool memory);

    function getPolicy(uint256 policyId) external view returns (Policy memory);

    function getUserPolicies(address user) external view returns (uint256[] memory);

    function getUserLiquidity(address user, uint256 poolId) external view returns (uint256 shares, uint256 botAmount);

    function getPoolStats(uint256 poolId)
        external
        view
        returns (
            uint256 totalLiquidity,
            uint256 availableLiquidity,
            uint256 activePolicies,
            uint256 premiumsCollected,
            uint256 claimsPaid,
            uint256 lockedCoverage
        );

    function getAvailablePoolLiquidity(uint256 poolId) external view returns (uint256);

    function getPremium(
        uint256 productId,
        uint256 coverageAmount,
        uint256 duration
    ) external view returns (uint256 totalPremium, uint256 protocolFee, uint256 poolPremium);

    function checkPolicyTrigger(uint256 policyId) external view returns (bool isEligible, string memory reason);

    function getClaimAmount(uint256 policyId) external view returns (uint256);

    function getProtocolStats() external view returns (ProtocolStats memory);

    function getOracleConfig() external view returns (OracleConfig memory);

    function getRiskParameters() external view returns (RiskParameters memory);
}
