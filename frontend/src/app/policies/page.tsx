"use client";

import React from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { Shield, ArrowRight, Clock, AlertCircle, FileText, CheckCircle2, Zap } from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI } from "@/config/contracts";
import { formatBOT, formatDate, formatUSDPrice, getStatusBadge } from "@/lib/format";

export default function PoliciesPage() {
  const { address, isConnected } = useAccount();

  // Read User's Policy IDs
  const { data: userPolicyIds, isLoading: idsLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getUserPolicies",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const policyCalls = (userPolicyIds || []).map((id) => ({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPolicy" as const,
    args: [id] as const,
  }));

  const { data: policiesData, isLoading: policiesLoading } = useReadContracts({
    contracts: policyCalls,
    query: { enabled: policyCalls.length > 0 },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-botCyan/30 bg-botCyan/10 px-3 py-1 text-xs font-semibold text-botCyan">
            <FileText className="h-3.5 w-3.5" />
            <span>Policy Management</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            My Protection Policies
          </h1>
          <p className="text-slate-400 text-sm">
            Review active coverage, monitor real-time trigger conditions, and settle parametric claims.
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-botCyan to-botBlue px-4 py-2.5 text-xs font-semibold text-white shadow-cyanGlow hover:opacity-95 transition-all self-start md:self-auto"
        >
          <Shield className="h-4 w-4" />
          <span>New Protection</span>
        </Link>
      </div>

      {/* Main Content */}
      {!isConnected ? (
        <div className="cyber-card rounded-2xl p-12 text-center space-y-4">
          <Shield className="h-12 w-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Wallet Not Connected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please connect your Web3 wallet to load your active and past parametric policies.
          </p>
        </div>
      ) : idsLoading || policiesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cyber-card rounded-xl p-6 h-28 animate-pulse bg-surface/50" />
          ))}
        </div>
      ) : !userPolicyIds || userPolicyIds.length === 0 ? (
        <div className="cyber-card rounded-2xl p-12 text-center space-y-4">
          <Shield className="h-12 w-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Policies Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You do not currently hold any parametric protection policies. Browse our protection products to hedge downside market risk.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-surface border border-botCyan/30 px-5 py-2.5 text-xs font-semibold text-botCyan hover:bg-botCyan/15 transition-all"
          >
            <span>Explore Protection Products</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {policiesData?.map((item) => {
            if (!item.result) return null;
            const policy = item.result as any;
            const badge = getStatusBadge(policy.status);
            const isPriceProtection = policy.productType === 0;

            return (
              <div
                key={policy.policyId.toString()}
                className="cyber-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-botCyan/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-white">
                      Policy #{policy.policyId.toString()}
                    </span>
                    <span className={`cyber-badge ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {isPriceProtection ? "BOT Price Protection" : "BotLend Protection"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Coverage</span>
                      <p className="font-bold text-white">{formatBOT(policy.coverageAmount)} BOT</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Premium Paid</span>
                      <p className="font-semibold text-botCyan">{formatBOT(policy.premiumPaid, 4)} BOT</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Trigger Target</span>
                      <p className="font-semibold text-slate-200">
                        {isPriceProtection
                          ? `BOT <= ${formatUSDPrice(policy.triggerValue)}`
                          : `HF < ${(Number(policy.triggerValue) / 1e18).toFixed(2)}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Expiry</span>
                      <p className="font-medium text-slate-300">{formatDate(policy.expiryTime)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <Link
                    href={`/policy/${policy.policyId.toString()}`}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-surfaceBorder hover:border-botCyan hover:text-botCyan text-slate-200 text-xs font-semibold transition-all"
                  >
                    <span>View Policy Details</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
