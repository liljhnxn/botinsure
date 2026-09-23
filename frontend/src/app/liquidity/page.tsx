"use client";

import React from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { Coins, ArrowRight, Layers, TrendingUp, ShieldAlert, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI } from "@/config/contracts";
import { formatBOT } from "@/lib/format";

export default function LiquidityDashboardPage() {
  const { address, isConnected } = useAccount();

  // Read Pool Count
  const { data: countData, isLoading: countLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "poolCount",
  });

  const poolCount = Number(countData || 0n);

  // Read User Liquidity across pools
  const userLiqCalls = Array.from({ length: poolCount }, (_, i) => ({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getUserLiquidity" as const,
    args: address ? [address, BigInt(i + 1)] : undefined,
  }));

  const { data: userLiqData, isLoading: userLiqLoading } = useReadContracts({
    contracts: userLiqCalls,
    query: { enabled: !!address && poolCount > 0 },
  });

  // Read Pool Infos
  const poolCalls = Array.from({ length: poolCount }, (_, i) => ({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPool" as const,
    args: [BigInt(i + 1)] as const,
  }));

  const { data: poolsData } = useReadContracts({
    contracts: poolCalls,
    query: { enabled: poolCount > 0 },
  });

  // Aggregate user LP statistics
  let totalUserBotValue = 0n;
  let totalUserShares = 0n;

  if (userLiqData) {
    for (const item of userLiqData) {
      if (item.result) {
        const [shares, botAmt] = item.result as [bigint, bigint];
        totalUserShares += shares;
        totalUserBotValue += botAmt;
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-botCyan/30 bg-botCyan/10 px-3 py-1 text-xs font-semibold text-botCyan">
          <Coins className="h-3.5 w-3.5" />
          <span>Underwriting Capital</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Liquidity Provider Dashboard
        </h1>
        <p className="text-slate-400 text-sm">
          Deposit BOT into protection pools to earn underwriting yields from policy premiums.
        </p>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cyber-card rounded-2xl p-6 space-y-2 border-l-4 border-l-botCyan">
          <span className="text-xs text-slate-400 font-medium">My Total Pool Valuation</span>
          <div className="text-3xl font-extrabold text-white flex items-baseline gap-1">
            <span>{formatBOT(totalUserBotValue)}</span>
            <span className="text-xs text-slate-400 font-normal">BOT</span>
          </div>
          <p className="text-[11px] text-slate-400">Underlying redeemable BOT tokens</p>
        </div>

        <div className="cyber-card rounded-2xl p-6 space-y-2 border-l-4 border-l-botPurple">
          <span className="text-xs text-slate-400 font-medium">My Total Pool Shares</span>
          <div className="text-3xl font-extrabold text-white">
            {formatBOT(totalUserShares)}
          </div>
          <p className="text-[11px] text-slate-400">Cumulative ERC20 LP share tokens</p>
        </div>

        <div className="cyber-card rounded-2xl p-6 space-y-2 border-l-4 border-l-emerald-400">
          <span className="text-xs text-slate-400 font-medium">Underwriting Yield</span>
          <div className="text-3xl font-extrabold text-emerald-400">
            Variable
          </div>
          <p className="text-[11px] text-slate-400">Accrues dynamically as premiums are paid</p>
        </div>
      </div>

      {/* Pools Position Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-botCyan" />
          <span>My Pool Allocations</span>
        </h2>

        {!isConnected ? (
          <div className="cyber-card rounded-2xl p-12 text-center space-y-3">
            <Coins className="h-10 w-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Connect Wallet</h3>
            <p className="text-xs text-slate-400">
              Please connect your wallet to inspect your pool share holdings.
            </p>
          </div>
        ) : countLoading || userLiqLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="cyber-card rounded-xl p-6 h-28 animate-pulse bg-surface/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: poolCount }, (_, i) => {
              const pId = BigInt(i + 1);
              const pool = poolsData?.[i]?.result as any;
              const [shares, botAmt] = (userLiqData?.[i]?.result as [bigint, bigint]) || [0n, 0n];

              return (
                <div
                  key={pId.toString()}
                  className="cyber-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Pool #{pId.toString()}</span>
                      <h3 className="text-lg font-bold text-white">
                        {pool?.name || `Protection Pool #${pId.toString()}`}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 text-[10px]">Underlying BOT</span>
                        <p className="font-bold text-white">{formatBOT(botAmt)} BOT</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Pool Shares</span>
                        <p className="font-semibold text-botCyan">{formatBOT(shares)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Pool Share Token</span>
                        <p className="font-mono text-slate-300 text-[11px]">
                          {pool?.shareToken ? `${pool.shareToken.slice(0, 8)}...` : "--"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <Link
                      href={`/pool/${pId.toString()}`}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-surfaceBorder hover:border-botCyan text-slate-200 text-xs font-semibold transition-all"
                    >
                      <span>Deposit / Withdraw</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Risk Notice */}
      <div className="rounded-xl border border-surfaceBorder bg-surface/50 p-4 text-xs text-slate-400 space-y-1">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-amber-400" /> Underwriting Capital Risk Notice
        </span>
        <p className="text-[11px] leading-relaxed">
          Returns are variable and depend on premiums, claims, fees, and pool performance.
          Liquidity providers face downside risk if parametric claim payouts in an insurance pool exceed collected premiums.
        </p>
      </div>
    </div>
  );
}
