"use client";

import React, { useState } from "react";
import { Code, Copy, Check, ExternalLink, Terminal, Cpu, FileCode2, Layers, Activity } from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export default function DeveloperPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const solidityInterfaceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBotInsure {
    enum PolicyStatus { ACTIVE, TRIGGERED, CLAIMABLE, CLAIMED, EXPIRED, CANCELLED }

    struct Policy {
        uint256 policyId;
        address holder;
        uint256 poolId;
        uint256 productId;
        uint8 productType;
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
        address referenceId;
        uint256 claimDeadline;
    }

    function buyProtection(
        uint256 productId,
        uint256 coverageAmount,
        uint256 duration,
        address referenceId
    ) external returns (uint256 policyId);

    function checkPolicyTrigger(uint256 policyId)
        external
        view
        returns (bool isEligible, string memory reason);

    function settleClaim(uint256 policyId) external returns (uint256 payout);
}`;

  const viemCodeSnippet = `import { createPublicClient, createWalletClient, http, custom, parseEther } from "viem";
import { defineChain } from "viem";

export const botchainMainnet = defineChain({
  id: 677,
  name: "Botchain Mainnet",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.botchain.ai"] } },
  blockExplorers: { default: { name: "BotScan", url: "https://scan.botchain.ai" } }
});

const publicClient = createPublicClient({
  chain: botchainMainnet,
  transport: http(),
});

// 1. Check if policy trigger condition is currently satisfied
const [isEligible, reason] = await publicClient.readContract({
  address: "${CONTRACT_ADDRESSES.botInsure}",
  abi: BOTINSURE_ABI,
  functionName: "checkPolicyTrigger",
  args: [1n],
});

console.log("Eligible:", isEligible, "Reason:", reason);

// 2. Settle claim using connected wallet client
const walletClient = createWalletClient({
  chain: botchainMainnet,
  transport: custom(window.ethereum),
});

const [account] = await walletClient.getAddresses();
const hash = await walletClient.writeContract({
  address: "${CONTRACT_ADDRESSES.botInsure}",
  abi: BOTINSURE_ABI,
  functionName: "settleClaim",
  args: [1n],
  account,
});`;

  const botOracleSnippet = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBotOracle {
    function getLatestAnswer(uint256 feedId)
        external
        view
        returns (
            int256 answer,
            uint256 updatedAt,
            uint256 roundId
        );
}`;

  const botLendSnippet = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBotLend {
    function getHealthFactor(address user) external view returns (uint256);
    function getDebt(address user) external view returns (uint256);
    function getCollateralBalance(address user) external view returns (uint256);
}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-botCyan/30 bg-botCyan/10 px-3 py-1 text-xs font-semibold text-botCyan">
          <Terminal className="h-3.5 w-3.5" />
          <span>Integration & SDK Documentation</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Developer Documentation
        </h1>
        <p className="text-slate-400 text-sm">
          Integrate parametric protection directly into your Botchain dApps, automated bots, and DeFi vaults on Botchain Mainnet.
        </p>
      </div>

      {/* Contract Registry */}
      <div className="cyber-card rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="h-4 w-4 text-botCyan" />
          <span>Deployed Contract Registry (Botchain Mainnet - Chain ID 677)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400 font-sans font-semibold">BotInsure Core Protocol</span>
            <div className="flex items-center justify-between text-slate-200">
              <span className="text-xs truncate">{CONTRACT_ADDRESSES.botInsure}</span>
              <button
                onClick={() => copyToClipboard(CONTRACT_ADDRESSES.botInsure, "core")}
                className="p-1 hover:text-botCyan ml-2"
              >
                {copiedKey === "core" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <a
              href={`https://scan.botchain.ai/address/${CONTRACT_ADDRESSES.botInsure}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-botCyan flex items-center gap-1 font-sans hover:underline pt-1 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/botchain-logo.png" alt="BOT Chain" className="h-3 w-3 rounded-full object-cover shrink-0" />
              <span>View BotScan Explorer</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-70 group-hover:opacity-100" />
            </a>
          </div>

          <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400 font-sans font-semibold">BOT Token (WBOT)</span>
            <div className="flex items-center justify-between text-slate-200">
              <span className="text-xs truncate">{CONTRACT_ADDRESSES.botToken}</span>
              <button
                onClick={() => copyToClipboard(CONTRACT_ADDRESSES.botToken, "token")}
                className="p-1 hover:text-botCyan ml-2"
              >
                {copiedKey === "token" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <a
              href={`https://scan.botchain.ai/address/${CONTRACT_ADDRESSES.botToken}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-botCyan flex items-center gap-1 font-sans hover:underline pt-1 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/botchain-logo.png" alt="BOT Chain" className="h-3 w-3 rounded-full object-cover shrink-0" />
              <span>View BotScan Explorer</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-70 group-hover:opacity-100" />
            </a>
          </div>

          <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400 font-sans font-semibold">BotOracle Price Feed</span>
            <div className="flex items-center justify-between text-slate-200">
              <span className="text-xs truncate">{CONTRACT_ADDRESSES.botOracle}</span>
              <button
                onClick={() => copyToClipboard(CONTRACT_ADDRESSES.botOracle, "oracle")}
                className="p-1 hover:text-botCyan ml-2"
              >
                {copiedKey === "oracle" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 font-sans">Feed #1: BOT/USD (8 decimals)</span>
              <a
                href={`https://scan.botchain.ai/address/${CONTRACT_ADDRESSES.botOracle}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-botCyan flex items-center gap-1 font-sans hover:underline group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/botchain-logo.png" alt="BOT Chain" className="h-3 w-3 rounded-full object-cover shrink-0" />
                <span>BotScan</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-70 group-hover:opacity-100" />
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400 font-sans font-semibold">BotLend Protocol</span>
            <div className="flex items-center justify-between text-slate-200">
              <span className="text-xs truncate">{CONTRACT_ADDRESSES.botLend}</span>
              <button
                onClick={() => copyToClipboard(CONTRACT_ADDRESSES.botLend, "lend")}
                className="p-1 hover:text-botCyan ml-2"
              >
                {copiedKey === "lend" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 font-sans">Monitors position health factors (1e18 = 1.0)</span>
              <a
                href={`https://scan.botchain.ai/address/${CONTRACT_ADDRESSES.botLend}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-botCyan flex items-center gap-1 font-sans hover:underline group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/botchain-logo.png" alt="BOT Chain" className="h-3 w-3 rounded-full object-cover shrink-0" />
                <span>BotScan</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-70 group-hover:opacity-100" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Code Snippet: Solidity Interface */}
      <div className="cyber-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-botPurple" />
            <span>Solidity Interface (IBotInsure.sol)</span>
          </h2>
          <button
            onClick={() => copyToClipboard(solidityInterfaceCode, "sol")}
            className="flex items-center gap-1 text-xs text-botCyan hover:underline font-semibold"
          >
            {copiedKey === "sol" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedKey === "sol" ? "Copied!" : "Copy Interface"}</span>
          </button>
        </div>
        <pre className="rounded-xl bg-surface/90 border border-surfaceBorder p-4 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {solidityInterfaceCode}
        </pre>
      </div>

      {/* Code Snippet: Viem Usage */}
      <div className="cyber-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code className="h-4 w-4 text-botBlue" />
            <span>Typescript & Viem Integration Example</span>
          </h2>
          <button
            onClick={() => copyToClipboard(viemCodeSnippet, "viem")}
            className="flex items-center gap-1 text-xs text-botCyan hover:underline font-semibold"
          >
            {copiedKey === "viem" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedKey === "viem" ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>
        <pre className="rounded-xl bg-surface/90 border border-surfaceBorder p-4 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {viemCodeSnippet}
        </pre>
      </div>

      {/* External Oracle & BotLend Interfaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="cyber-card rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-botCyan" />
            <span>BotOracle Interface (IBotOracle)</span>
          </h3>
          <pre className="rounded-xl bg-surface/90 border border-surfaceBorder p-3 text-[11px] font-mono text-slate-300 overflow-x-auto">
            {botOracleSnippet}
          </pre>
        </div>

        <div className="cyber-card rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-botPurple" />
            <span>BotLend Interface (IBotLend)</span>
          </h3>
          <pre className="rounded-xl bg-surface/90 border border-surfaceBorder p-3 text-[11px] font-mono text-slate-300 overflow-x-auto">
            {botLendSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
