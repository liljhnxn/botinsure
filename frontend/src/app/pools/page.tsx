"use client";

import React from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { Layers, ArrowRight, TrendingUp, AlertTriangle, ShieldCheck, Percent, Coins } from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI } from "@/config/contracts";
import { formatBOT } from "@/lib/format";

export default function PoolsPage() {
  const { data: countData, isLoading: countLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "poolCount",
  });

  const poolCount = Number(countData || 0n);

  const poolCalls = Array.from({ length: poolCount }, (_, i) => ({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPool" as const,
    args: [BigInt(i + 1)] as const,
  }));

  const { data: poolsData, isLoading: poolsLoading } = useReadContracts({
    contracts: poolCalls,
    query: { enabled: poolCount > 0 },
  });

  const statsCalls = Array.from({ length: poolCount }, (_, i) => ({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPoolStats" as const,
    args: [BigInt(i + 1)] as const,
  }));

  const { data: statsData } = useReadContracts({
    contracts: statsCalls,
    query: { enabled: poolCount > 0 },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-botCyan/30 bg-botCyan/10 px-3 py-1 text-xs font-semibold text-botCyan">
            <Layers className="h-3.5 w-3.5" />
            <span>Underwriting Capital</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Protection Pools
          </h1>
          <p className="text-slate-400 text-sm">
            Liquidity pools underwrite parametric risks and earn variable protocol premiums in BOT.
          </p>
        </div>

        <Link
          href="/liquidity"
          className="inline-flex items-center gap-2 rounded-xl bg-surface border border-botCyan/30 px-4 py-2.5 text-xs font-semibold text-botCyan hover:bg-botCyan/15 transition-all self-start md:self-auto"
        >
          <Coins className="h-4 w-4" />
          <span>My LP Portfolio</span>
        </Link>
      </div>

      {/* Pools Grid */}
      {countLoading || poolsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="cyber-card rounded-2xl p-6 h-64 animate-pulse bg-surface/50" />
          ))}
        </div>
      ) : poolCount === 0 ? (
        <div className="cyber-card rounded-2xl p-12 text-center space-y-4">
          <Layers className="h-12 w-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Pools Initialized</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The protocol has not initialized any protection pools yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {poolsData?.map((item, index) => {
            if (!item.result) return null;
            const pool = item.result as any;
            const stats = statsData?.[index]?.result as any;

            const totalLiquidity = stats?.[0] ?? 0n;
            const availableLiquidity = stats?.[1] ?? 0n;
            const activePolicies = stats?.[2] ?? 0n;
            const premiumsCollected = stats?.[3] ?? 0n;
            const claimsPaid = stats?.[4] ?? 0n;
            const lockedCoverage = stats?.[5] ?? 0n;

            const utilizationPct =
              totalLiquidity > 0n
                ? ((Number(lockedCoverage) * 100) / Number(totalLiquidity)).toFixed(1)
                : "0.0";

            return (
              <div
                key={pool.id.toString()}
                className="cyber-card rounded-2xl p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400">Pool #{pool.id.toString()}</span>
                      <h2 className="text-xl font-bold text-white mt-1">{pool.name}</h2>
                    </div>
                    <span className="cyber-badge bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      Active
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
                      <span className="text-[10px] text-slate-400">Total Liquidity</span>
                      <p className="text-sm font-bold text-white">{formatBOT(totalLiquidity)} BOT</p>
                    </div>

                    <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
                      <span className="text-[10px] text-slate-400">Available Liquidity</span>
                      <p className="text-sm font-bold text-emerald-400">{formatBOT(availableLiquidity)} BOT</p>
                    </div>

                    <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
                      <span className="text-[10px] text-slate-400">Utilization</span>
                      <p className="text-sm font-bold text-botCyan">{utilizationPct}%</p>
                    </div>

                    <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
                      <span className="text-[10px] text-slate-400">Active Policies</span>
                      <p className="text-sm font-bold text-white">{activePolicies.toString()}</p>
                    </div>

                    <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
                      <span className="text-[10px] text-slate-400">Premiums Earned</span>
                      <p className="text-sm font-bold text-botPurple">{formatBOT(premiumsCollected, 4)} BOT</p>
                    </div>

                    <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
                      <span className="text-[10px] text-slate-400">Claims Paid</span>
                      <p className="text-sm font-bold text-slate-300">{formatBOT(claimsPaid)} BOT</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    * Returns are variable and depend on premiums, claims, fees, and pool performance.
                  </p>
                </div>

                <div>
                  <Link
                    href={`/pool/${pool.id.toString()}`}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface border border-surfaceBorder hover:border-botCyan hover:text-botCyan text-slate-200 font-semibold text-xs transition-all"
                  >
                    <span>Manage Liquidity & Deposit</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
