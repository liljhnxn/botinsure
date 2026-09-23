"use client";

import React from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { Shield, ArrowRight, Zap, AlertTriangle, Layers, Percent, Clock, DollarSign } from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI } from "@/config/contracts";
import { formatBOT, formatDuration, formatUSDPrice } from "@/lib/format";

export default function ProductsPage() {
  // Read total product count
  const { data: countData, isLoading: countLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "productCount",
  });

  const productCount = Number(countData || 0n);

  // Prepare calls for all products
  const productCalls = Array.from({ length: productCount }, (_, i) => ({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getProduct" as const,
    args: [BigInt(i + 1)] as const,
  }));

  const { data: productsData, isLoading: productsLoading } = useReadContracts({
    contracts: productCalls,
    query: { enabled: productCount > 0 },
  });

  // Prepare calls for pool available liquidity for each product
  const liquidityCalls = (productsData || []).map((item) => {
    const prod = item.result as any;
    return {
      address: CONTRACT_ADDRESSES.botInsure,
      abi: BOTINSURE_ABI,
      functionName: "getAvailablePoolLiquidity" as const,
      args: [prod?.poolId || 1n] as const,
    };
  });

  const { data: liquidityData } = useReadContracts({
    contracts: liquidityCalls,
    query: { enabled: liquidityCalls.length > 0 },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-botCyan/30 bg-botCyan/10 px-3 py-1 text-xs font-semibold text-botCyan">
          <Shield className="h-3.5 w-3.5" />
          <span>Parametric Coverage Catalog</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Protection Products
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Purchase transparent on-chain protection against market volatility and lending liquidation events.
          Premiums are calculated algorithmically, and claims trigger autonomously upon verifiable data conditions.
        </p>
      </div>

      {/* Products Grid */}
      {countLoading || productsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="cyber-card rounded-2xl p-6 h-72 animate-pulse bg-surface/50" />
          ))}
        </div>
      ) : productCount === 0 ? (
        <div className="cyber-card rounded-2xl p-12 text-center space-y-4">
          <Shield className="h-12 w-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Protection Products Available</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The protocol has not registered any active protection products yet. Check back soon or visit the Admin dashboard if you are authorized.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {productsData?.map((item, index) => {
            if (!item.result) return null;
            const product = item.result as any;
            const availableLiquidity = liquidityData?.[index]?.result as bigint | undefined;

            const isPriceProtection = product.productType === 0;
            const premiumAnnualPct = (Number(product.premiumRate) / 100).toFixed(2);
            const payoutPct = (Number(product.payoutBps) / 100).toFixed(0);

            return (
              <div
                key={product.id.toString()}
                className="cyber-card rounded-2xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-botCyan/5 rounded-full blur-2xl group-hover:bg-botCyan/10 transition-all" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-botCyan/15 text-botCyan border border-botCyan/30">
                          {isPriceProtection ? "Price Oracle Trigger" : "Lending Position Trigger"}
                        </span>
                        {product.active ? (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Inactive
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-white mt-2 group-hover:text-botCyan transition-colors">
                        {product.name}
                      </h2>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Specification Matrix */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg bg-surface/80 p-3 border border-surfaceBorder/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-botCyan" /> Coverage Limits
                      </span>
                      <span className="text-xs font-bold text-white">
                        {formatBOT(product.minCoverage)} - {formatBOT(product.maxCoverage)} BOT
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface/80 p-3 border border-surfaceBorder/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Percent className="h-3 w-3 text-emerald-400" /> Annual Rate / Payout
                      </span>
                      <span className="text-xs font-bold text-white">
                        {premiumAnnualPct}% / {payoutPct}% Payout
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface/80 p-3 border border-surfaceBorder/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" /> Max Duration
                      </span>
                      <span className="text-xs font-bold text-white">
                        {formatDuration(product.maxDuration)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface/80 p-3 border border-surfaceBorder/80 space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Zap className="h-3 w-3 text-botPurple" /> Trigger Threshold
                      </span>
                      <span className="text-xs font-bold text-botCyan">
                        {isPriceProtection
                          ? `BOT <= ${formatUSDPrice(product.triggerValue)}`
                          : `Health Factor < ${(Number(product.triggerValue) / 1e18).toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Available Pool Liquidity */}
                  <div className="rounded-lg bg-surface/50 p-3 border border-surfaceBorder flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-botBlue" /> Underwriting Pool Liquidity:
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {formatBOT(availableLiquidity)} BOT available
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/protect/${product.id.toString()}`}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-botCyan to-botBlue hover:opacity-95 text-white font-semibold text-sm shadow-cyanGlow transition-all"
                  >
                    <span>Get Protection</span>
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
