import deployedData from "./deployedContracts.json";

export const CONTRACT_ADDRESSES = {
  botInsure: (process.env.NEXT_PUBLIC_BOTINSURE_CONTRACT_ADDRESS ||
    deployedData?.contracts?.BotInsure ||
    "0xD874Fad6896fA787D1793F6233C8021D0c2451F4") as `0x${string}`,
  botToken: (process.env.NEXT_PUBLIC_BOT_TOKEN_ADDRESS ||
    deployedData?.contracts?.BotToken ||
    "0xD5452816194a3784dBa983426cCe7c122F4abd30") as `0x${string}`,
  botOracle: (process.env.NEXT_PUBLIC_BOTORACLE_CONTRACT_ADDRESS ||
    deployedData?.contracts?.BotOracle ||
    "0xb7Ca90c5d60B86CF08B4BE94c973EcCCa4D2f844") as `0x${string}`,
  botLend: (process.env.NEXT_PUBLIC_BOTLEND_CONTRACT_ADDRESS ||
    deployedData?.contracts?.BotLend ||
    "0x7D097D3C1C56Fb555F76f7C57E84543CAeB6674a") as `0x${string}`,
};

export const BOTINSURE_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint8", name: "productType", type: "uint8" },
          { internalType: "uint256", name: "minCoverage", type: "uint256" },
          { internalType: "uint256", name: "maxCoverage", type: "uint256" },
          { internalType: "uint256", name: "premiumRate", type: "uint256" },
          { internalType: "uint256", name: "maxDuration", type: "uint256" },
          { internalType: "uint256", name: "payoutBps", type: "uint256" },
          { internalType: "uint256", name: "poolId", type: "uint256" },
          { internalType: "uint256", name: "oracleFeedId", type: "uint256" },
          { internalType: "uint8", name: "triggerType", type: "uint8" },
          { internalType: "uint256", name: "triggerValue", type: "uint256" },
        ],
        internalType: "struct IBotInsure.CreateProductParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "createProduct",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "shareTokenName", type: "string" },
      { internalType: "string", name: "shareTokenSymbol", type: "string" },
    ],
    name: "createPool",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "productId", type: "uint256" },
      { internalType: "uint256", name: "coverageAmount", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "address", name: "referenceId", type: "address" },
    ],
    name: "buyProtection",
    outputs: [{ internalType: "uint256", name: "policyId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "provideLiquidity",
    outputs: [{ internalType: "uint256", name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "uint256", name: "shares", type: "uint256" },
    ],
    name: "withdrawLiquidity",
    outputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "policyId", type: "uint256" }],
    name: "activateTrigger",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "policyId", type: "uint256" }],
    name: "submitClaim",
    outputs: [{ internalType: "uint256", name: "payout", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "policyId", type: "uint256" }],
    name: "settleClaim",
    outputs: [{ internalType: "uint256", name: "payout", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "policyId", type: "uint256" }],
    name: "getPolicy",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "policyId", type: "uint256" },
          { internalType: "address", name: "holder", type: "address" },
          { internalType: "uint256", name: "poolId", type: "uint256" },
          { internalType: "uint256", name: "productId", type: "uint256" },
          { internalType: "uint8", name: "productType", type: "uint8" },
          { internalType: "uint256", name: "coverageAmount", type: "uint256" },
          { internalType: "uint256", name: "premiumPaid", type: "uint256" },
          { internalType: "uint256", name: "triggerValue", type: "uint256" },
          { internalType: "uint256", name: "startTime", type: "uint256" },
          { internalType: "uint256", name: "expiryTime", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "bool", name: "claimed", type: "bool" },
          { internalType: "uint256", name: "claimAmount", type: "uint256" },
          { internalType: "uint256", name: "claimTime", type: "uint256" },
          { internalType: "uint256", name: "oracleFeedId", type: "uint256" },
          { internalType: "address", name: "referenceId", type: "address" },
          { internalType: "uint256", name: "claimDeadline", type: "uint256" },
        ],
        internalType: "struct IBotInsure.Policy",
        name: "pol",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "productId", type: "uint256" }],
    name: "getProduct",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint8", name: "productType", type: "uint8" },
          { internalType: "bool", name: "active", type: "bool" },
          { internalType: "uint256", name: "minCoverage", type: "uint256" },
          { internalType: "uint256", name: "maxCoverage", type: "uint256" },
          { internalType: "uint256", name: "premiumRate", type: "uint256" },
          { internalType: "uint256", name: "maxDuration", type: "uint256" },
          { internalType: "uint256", name: "payoutBps", type: "uint256" },
          { internalType: "uint256", name: "poolId", type: "uint256" },
          { internalType: "uint256", name: "oracleFeedId", type: "uint256" },
          { internalType: "uint8", name: "triggerType", type: "uint8" },
          { internalType: "uint256", name: "triggerValue", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
        ],
        internalType: "struct IBotInsure.ProtectionProduct",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
    name: "getPool",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "address", name: "shareToken", type: "address" },
          { internalType: "uint256", name: "totalDeposited", type: "uint256" },
          { internalType: "uint256", name: "totalPremiumsCollected", type: "uint256" },
          { internalType: "uint256", name: "totalClaimsPaid", type: "uint256" },
          { internalType: "uint256", name: "lockedCoverage", type: "uint256" },
          { internalType: "uint256", name: "activePoliciesCount", type: "uint256" },
          { internalType: "bool", name: "active", type: "bool" },
        ],
        internalType: "struct IBotInsure.ProtectionPool",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserPolicies",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "poolId", type: "uint256" },
    ],
    name: "getUserLiquidity",
    outputs: [
      { internalType: "uint256", name: "shares", type: "uint256" },
      { internalType: "uint256", name: "botAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
    name: "getPoolStats",
    outputs: [
      { internalType: "uint256", name: "totalLiquidity", type: "uint256" },
      { internalType: "uint256", name: "availableLiquidity", type: "uint256" },
      { internalType: "uint256", name: "activePolicies", type: "uint256" },
      { internalType: "uint256", name: "premiumsCollected", type: "uint256" },
      { internalType: "uint256", name: "claimsPaid", type: "uint256" },
      { internalType: "uint256", name: "lockedCoverage", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
    name: "getAvailablePoolLiquidity",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "productId", type: "uint256" },
      { internalType: "uint256", name: "coverageAmount", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
    ],
    name: "getPremium",
    outputs: [
      { internalType: "uint256", name: "totalPremium", type: "uint256" },
      { internalType: "uint256", name: "protocolFee", type: "uint256" },
      { internalType: "uint256", name: "poolPremium", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "policyId", type: "uint256" }],
    name: "checkPolicyTrigger",
    outputs: [
      { internalType: "bool", name: "isEligible", type: "bool" },
      { internalType: "string", name: "reason", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "policyId", type: "uint256" }],
    name: "getClaimAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getProtocolStats",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "totalPoolLiquidity", type: "uint256" },
          { internalType: "uint256", name: "totalActivePolicies", type: "uint256" },
          { internalType: "uint256", name: "totalPremiumsCollected", type: "uint256" },
          { internalType: "uint256", name: "totalClaimsPaid", type: "uint256" },
          { internalType: "uint256", name: "totalAvailableLiquidity", type: "uint256" },
          { internalType: "uint256", name: "poolCount", type: "uint256" },
          { internalType: "uint256", name: "productCount", type: "uint256" },
          { internalType: "uint256", name: "totalPoliciesCount", type: "uint256" },
        ],
        internalType: "struct IBotInsure.ProtocolStats",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRiskParameters",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "protocolFeeBps", type: "uint256" },
          { internalType: "uint256", name: "claimWindowDuration", type: "uint256" },
          { internalType: "uint256", name: "minDuration", type: "uint256" },
          { internalType: "uint256", name: "maxDuration", type: "uint256" },
        ],
        internalType: "struct IBotInsure.RiskParameters",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getOracleConfig",
    outputs: [
      {
        components: [
          { internalType: "address", name: "oracleAddress", type: "address" },
          { internalType: "uint256", name: "maxOracleAge", type: "uint256" },
          { internalType: "address", name: "botLendAddress", type: "address" },
        ],
        internalType: "struct IBotInsure.OracleConfig",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "productCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "poolCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "newFeeBps", type: "uint256" }],
    name: "setProtocolFeeBps",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "newDuration", type: "uint256" }],
    name: "setClaimWindowDuration",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "faucet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ORACLE_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "feedId", type: "uint256" }],
    name: "getLatestAnswer",
    outputs: [
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint256", name: "roundId", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "feedId", type: "uint256" },
      { internalType: "int256", name: "price", type: "int256" },
    ],
    name: "setPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const BOTLEND_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getHealthFactor",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "healthFactor", type: "uint256" },
    ],
    name: "setHealthFactor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
