"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { Zap, ArrowRight, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI } from "@/config/contracts";
import { formatBOT, formatDate, getStatusBadge } from "@/lib/format";

export default function ClaimsPage() {
  const { address, isConnected } = useAccount();
  const [filter, setFilter] = useState<"ALL" | "CLAIMABLE" | "CLAIMED" | "EXPIRED">("ALL");

  // Read User Policy IDs
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

  const allPolicies = (policiesData || []).map((item) => item.result as any).filter(Boolean);

  const filteredPolicies = allPolicies.filter((policy) => {
    if (filter === "ALL") return true;
    if (filter === "CLAIMABLE") return policy.status === 1 || policy.status === 2;
    if (filter === "CLAIMED") return policy.status === 3;
    if (filter === "EXPIRED") return policy.status === 4;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-botCyan/30 bg-botCyan/10 px-3 py-1 text-xs font-semibold text-botCyan">
            <Zap className="h-3.5 w-3.5" />
            <span>Parametric Claims</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Claims Management
          </h1>
          <p className="text-slate-400 text-sm">
            Deterministic claim settlement triggered by verifiable on-chain oracle feeds.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-surface rounded-xl p-1 border border-surfaceBorder self-start md:self-auto text-xs font-semibold">
          {(["ALL", "CLAIMABLE", "CLAIMED", "EXPIRED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === tab
                  ? "bg-botCyan text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {!isConnected ? (
        <div className="cyber-card rounded-2xl p-12 text-center space-y-4">
          <Zap className="h-12 w-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">Wallet Not Connected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Connect your wallet to inspect claim eligibility for your policies.
          </p>
        </div>
      ) : idsLoading || policiesLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="cyber-card rounded-xl p-6 h-24 animate-pulse bg-surface/50" />
          ))}
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="cyber-card rounded-2xl p-12 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Claims Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {filter === "CLAIMABLE"
              ? "You do not have any triggered policies currently awaiting claim settlement."
              : filter === "CLAIMED"
              ? "You have not settled any claims yet."
              : "No policies match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPolicies.map((policy) => {
            const badge = getStatusBadge(policy.status);
            const isClaimable = policy.status === 1 || policy.status === 2;

            return (
              <div
                key={policy.policyId.toString()}
                className="cyber-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-white">
                      Policy #{policy.policyId.toString()}
                    </span>
                    <span className={`cyber-badge ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px]">Coverage</span>
                      <p className="font-bold text-white">{formatBOT(policy.coverageAmount)} BOT</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Claim Status</span>
                      <p className="font-semibold text-slate-200">
                        {policy.claimed ? "Settled & Paid" : isClaimable ? "Ready to Settle" : "Monitoring Target"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Settled Amount</span>
                      <p className="font-semibold text-emerald-400">
                        {policy.claimed ? `${formatBOT(policy.claimAmount)} BOT` : "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Claim Deadline</span>
                      <p className="font-medium text-slate-300">
                        {policy.claimDeadline > 0n ? formatDate(policy.claimDeadline) : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <Link
                    href={`/claim/${policy.policyId.toString()}`}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isClaimable
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-cyanGlow"
                        : "bg-surface border border-surfaceBorder hover:border-botCyan text-slate-200"
                    }`}
                  >
                    <span>{isClaimable ? "Settle Payout Now" : "Claim Details"}</span>
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
