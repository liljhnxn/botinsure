"use client";

import React from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import {
  Shield,
  Coins,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Layers,
  Zap,
  CheckCircle2,
  Lock,
  PieChart,
  Users,
  Activity,
  Globe,
  Compass,
} from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI } from "@/config/contracts";
import { formatBOT } from "@/lib/format";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  // Read Global Protocol Stats from Contract
  const { data: statsData, isLoading: statsLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getProtocolStats",
  });

  // Read User Policy IDs
  const { data: userPolicyIds } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getUserPolicies",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Fetch all user policies to calculate user-specific statistics
  const policyCalls = (userPolicyIds || []).map((id) => ({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPolicy" as const,
    args: [id] as const,
  }));

  const { data: userPoliciesData } = useReadContracts({
    contracts: policyCalls,
    query: { enabled: policyCalls.length > 0 },
  });

  // Calculate User Stats accurately from real on-chain data
  let userActivePolicies = 0;
  let userTotalCoverage = 0n;
  let userPremiumsPaid = 0n;
  let userClaimablePolicies = 0;

  if (userPoliciesData) {
    for (const item of userPoliciesData) {
      if (item.result) {
        const policy = item.result as any;
        // Status: 0=ACTIVE, 1=TRIGGERED, 2=CLAIMABLE, 3=CLAIMED, 4=EXPIRED
        if (policy.status === 0) {
          userActivePolicies++;
          userTotalCoverage += policy.coverageAmount;
        } else if (policy.status === 1 || policy.status === 2) {
          userClaimablePolicies++;
        }
        userPremiumsPaid += policy.premiumPaid;
      }
    }
  }

  const totalPoolLiquidity = statsData?.totalPoolLiquidity ?? 0n;
  const totalActivePolicies = statsData?.totalActivePolicies ?? 0n;
  const totalPremiumsCollected = statsData?.totalPremiumsCollected ?? 0n;
  const totalClaimsPaid = statsData?.totalClaimsPaid ?? 0n;
  const totalAvailableLiquidity = statsData?.totalAvailableLiquidity ?? 0n;
  const poolCount = statsData?.poolCount ?? 0n;

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-surfaceBorder bg-gradient-to-r from-surface to-[#0e172a] p-8 md:p-10 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-botCyan/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-botBlue/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-botCyan/30 bg-botCyan/10 px-3 py-1 text-xs font-semibold text-botCyan">
            <Zap className="h-3.5 w-3.5" />
            <span>Parametric Protection on Botchain</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Code-Enforced DeFi Coverage. <br />
            <span className="bg-gradient-to-r from-botCyan to-botBlue bg-clip-text text-transparent">
              Zero Adjusters. Instant Payouts.
            </span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            BotInsure provides verifiable parametric protection against BOT price drops and BotLend liquidation triggers.
            Smart contracts autonomously verify live BotOracle feeds and settle claims deterministically in BOT.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/products"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-botCyan to-botBlue px-5 py-3 text-sm font-semibold text-white shadow-cyanGlow hover:opacity-95 transition-all"
            >
              <Shield className="h-4 w-4" />
              <span>Get Protection</span>
            </Link>
            <Link
              href="/liquidity"
              className="flex items-center gap-2 rounded-xl border border-surfaceBorder bg-surface px-5 py-3 text-sm font-semibold text-slate-200 hover:border-botCyan/40 hover:bg-surfaceHover transition-all"
            >
              <Coins className="h-4 w-4 text-botCyan" />
              <span>Provide Liquidity</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Protocol Global Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-botCyan" />
            <span>Protocol Live Statistics</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {statsLoading ? "Querying contracts..." : "Verified On-Chain"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="cyber-card rounded-xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Total Pool Liquidity</span>
            <div className="text-xl font-bold text-white flex items-baseline gap-1">
              <span>{formatBOT(totalPoolLiquidity)}</span>
              <span className="text-xs text-slate-400 font-normal">BOT</span>
            </div>
            <span className="text-[10px] text-slate-400">Total assets in pools</span>
          </div>

          <div className="cyber-card rounded-xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Available Liquidity</span>
            <div className="text-xl font-bold text-emerald-400 flex items-baseline gap-1">
              <span>{formatBOT(totalAvailableLiquidity)}</span>
              <span className="text-xs text-emerald-400/70 font-normal">BOT</span>
            </div>
            <span className="text-[10px] text-slate-400">Unreserved underwriting</span>
          </div>

          <div className="cyber-card rounded-xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Active Policies</span>
            <div className="text-xl font-bold text-white">
              {totalActivePolicies.toString()}
            </div>
            <span className="text-[10px] text-slate-400">Currently insured</span>
          </div>

          <div className="cyber-card rounded-xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Premiums Collected</span>
            <div className="text-xl font-bold text-botCyan flex items-baseline gap-1">
              <span>{formatBOT(totalPremiumsCollected)}</span>
              <span className="text-xs text-botCyan/70 font-normal">BOT</span>
            </div>
            <span className="text-[10px] text-slate-400">Cumulative protocol revenue</span>
          </div>

          <div className="cyber-card rounded-xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Claims Paid</span>
            <div className="text-xl font-bold text-botPurple flex items-baseline gap-1">
              <span>{formatBOT(totalClaimsPaid)}</span>
              <span className="text-xs text-botPurple/70 font-normal">BOT</span>
            </div>
            <span className="text-[10px] text-slate-400">Parametric payouts settled</span>
          </div>

          <div className="cyber-card rounded-xl p-4 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Active Pools</span>
            <div className="text-xl font-bold text-white">
              {poolCount.toString()}
            </div>
            <span className="text-[10px] text-slate-400">Underwriting pools</span>
          </div>
        </div>
      </div>

      {/* Connected User Overview Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-botBlue" />
          <span>My Coverage Overview</span>
        </h2>

        {isConnected ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="cyber-card rounded-xl p-5 border-l-4 border-l-botCyan">
              <span className="text-xs text-slate-400 font-medium">Active Policies</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                {userActivePolicies}
              </div>
              <p className="text-xs text-slate-400 mt-2">Active policy protections</p>
            </div>

            <div className="cyber-card rounded-xl p-5 border-l-4 border-l-emerald-400">
              <span className="text-xs text-slate-400 font-medium">Total Coverage Amount</span>
              <div className="text-2xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                <span>{formatBOT(userTotalCoverage)}</span>
                <span className="text-xs text-slate-400 font-normal">BOT</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Protected downside value</p>
            </div>

            <div className="cyber-card rounded-xl p-5 border-l-4 border-l-botPurple">
              <span className="text-xs text-slate-400 font-medium">Premiums Paid</span>
              <div className="text-2xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                <span>{formatBOT(userPremiumsPaid)}</span>
                <span className="text-xs text-slate-400 font-normal">BOT</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Total underwriting cost</p>
            </div>

            <div className="cyber-card rounded-xl p-5 border-l-4 border-l-amber-400">
              <span className="text-xs text-slate-400 font-medium">Claimable Policies</span>
              <div className="text-2xl font-extrabold text-amber-400 mt-1">
                {userClaimablePolicies}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {userClaimablePolicies > 0 ? (
                  <Link href="/claims" className="text-amber-300 font-semibold underline">
                    Ready to claim &rarr;
                  </Link>
                ) : (
                  "No pending payouts"
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="cyber-card rounded-xl p-6 text-center space-y-3">
            <p className="text-sm text-slate-300">
              Connect your Web3 wallet to inspect your active parametric policies, total coverage, and claims.
            </p>
          </div>
        )}
      </div>

      {/* Protocol Architecture Workflow */}
      <div className="cyber-card rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-white">How Parametric Protection Works on BotInsure</h3>
          <p className="text-xs text-slate-400">
            Automated code execution without human claims adjusters or arbitrary dispute committees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-surfaceBorder bg-surface p-4 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-botCyan/15 text-botCyan flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h4 className="font-semibold text-white text-sm">Select Product & Policy</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose coverage amount and duration. Fixed-point math calculates the deterministic premium in BOT.
            </p>
          </div>

          <div className="rounded-xl border border-surfaceBorder bg-surface p-4 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-botBlue/15 text-botBlue flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h4 className="font-semibold text-white text-sm">Underwriting Capital</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Premiums are deposited into the protection pool. 100% of user coverage is locked to guarantee solvency.
            </p>
          </div>

          <div className="rounded-xl border border-surfaceBorder bg-surface p-4 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-botPurple/15 text-botPurple flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h4 className="font-semibold text-white text-sm">Oracle Verification</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              BotOracle reports price or BotLend reports position health factor. If trigger threshold is reached, policy activates.
            </p>
          </div>

          <div className="rounded-xl border border-surfaceBorder bg-surface p-4 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h4 className="font-semibold text-white text-sm">Autonomous Settlement</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Triggered policy unlocks claim window. Smart contract immediately disburses BOT payout directly to user.
            </p>
          </div>
        </div>
      </div>

      {/* BOT Chain Native Ecosystem Callout */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-surface via-surface/80 to-emerald-500/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-cyanGlow/10">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/60 border border-emerald-500/30 p-2 shadow-cyanGlow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/botchain-logo.png"
              alt="BOT Chain"
              className="h-full w-full rounded-xl object-contain"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-white">Built on BOT Chain Mainnet</h3>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                Chain ID: 677
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              BotInsure leverages BOT Chain&apos;s high-throughput architecture, fast block finality, and ultra-low gas fees for sub-second parametric settlements.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="https://botchain.ai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-botCyan/20 hover:from-emerald-500/30 hover:to-botCyan/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all shadow-md group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/botchain-logo.png" alt="BOT Chain" className="h-4 w-4 rounded-full object-cover shrink-0 group-hover:scale-110 transition-transform" />
            <span>BOT Chain Website</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>

          <a
            href="https://scan.botchain.ai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-surfaceBorder hover:border-emerald-500/50 text-slate-200 hover:text-white font-semibold text-xs transition-all shadow-sm group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/botchain-logo.png" alt="BOT Chain" className="h-4 w-4 rounded-full object-cover shrink-0 group-hover:scale-110 transition-transform" />
            <span>BOT Chain Explorer</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </div>
  );
}
