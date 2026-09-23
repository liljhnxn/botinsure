"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import {
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Coins,
  Loader2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI, ORACLE_ABI, BOTLEND_ABI } from "@/config/contracts";
import { formatBOT, formatDate, formatUSDPrice, getStatusBadge } from "@/lib/format";

export default function ClaimDetailPage() {
  const params = useParams();
  const policyId = BigInt((params.id as string) || "1");
  const { address, isConnected } = useAccount();

  // Load Policy
  const { data: policyData, isLoading: policyLoading, refetch: refetchPolicy } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPolicy",
    args: [policyId],
  });

  const policy = policyData as any;

  // Check Trigger Status
  const { data: triggerCheckData, refetch: refetchTrigger } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "checkPolicyTrigger",
    args: [policyId],
    query: { enabled: !!policy },
  });

  const [isEligible, triggerReason] = (triggerCheckData as [boolean, string]) || [false, ""];

  // Read Oracle Price
  const { data: oracleFeedData } = useReadContract({
    address: CONTRACT_ADDRESSES.botOracle,
    abi: ORACLE_ABI,
    functionName: "getLatestAnswer",
    args: policy?.oracleFeedId ? [policy.oracleFeedId] : [1n],
    query: { enabled: !!policy && policy.productType === 0 },
  });

  const [latestAnswer, updatedAt] = (oracleFeedData as [bigint, bigint, bigint]) || [0n, 0n, 0n];

  // Read BotLend Health Factor
  const { data: botLendHealthFactor } = useReadContract({
    address: CONTRACT_ADDRESSES.botLend,
    abi: BOTLEND_ABI,
    functionName: "getHealthFactor",
    args: policy?.referenceId ? [policy.referenceId] : undefined,
    query: { enabled: !!policy && policy.productType === 1 },
  });

  // Calculate Claim Amount
  const { data: claimAmount } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getClaimAmount",
    args: [policyId],
    query: { enabled: !!policy },
  });

  // Claim Settlement Action
  const { writeContractAsync } = useWriteContract();
  const [isSettling, setIsSettling] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);

  const handleSettle = async () => {
    if (!address) return;
    try {
      setIsSettling(true);
      setTxError(null);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.botInsure,
        abi: BOTINSURE_ABI,
        functionName: "settleClaim",
        args: [policyId],
      });
      setTxSuccessHash(hash);
      setTimeout(async () => {
        await refetchPolicy();
        await refetchTrigger();
        setIsSettling(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setTxError(err.message || "Failed to settle claim");
      setIsSettling(false);
    }
  };

  if (policyLoading || !policy) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-botCyan animate-spin" />
        <p className="text-slate-400 text-sm">Querying claim record...</p>
      </div>
    );
  }

  const badge = getStatusBadge(policy.status);
  const isPriceProtection = policy.productType === 0;
  const isHolder = address && policy.holder.toLowerCase() === address.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surfaceBorder pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Claim File for Policy #{policy.policyId.toString()}</span>
            <span className={`cyber-badge ${badge.color}`}>{badge.label}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Parametric Settlement</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Policy Holder: {policy.holder}
          </p>
        </div>

        {!policy.claimed && isHolder && isEligible && (
          <button
            onClick={handleSettle}
            disabled={isSettling}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-cyanGlow hover:opacity-95 transition-all self-start md:self-auto disabled:opacity-50"
          >
            {isSettling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            <span>{isSettling ? "Broadcasting Settlement..." : "Execute Settlement"}</span>
          </button>
        )}
      </div>

      {txSuccessHash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            <span>Claim Settled! BOT Transferred.</span>
          </div>
          <p className="text-xs text-slate-300">
            Smart contract transferred {formatBOT(claimAmount as bigint | undefined)} BOT to {policy.holder}.
          </p>
          <a
            href={`https://scan.bohr.life/tx/${txSuccessHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-botCyan hover:underline font-mono"
          >
            <span>View BohrScan Transaction: {txSuccessHash.slice(0, 20)}...</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {txError && (
        <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{txError}</span>
        </div>
      )}

      {/* Grid: Settlement Proof & Oracle Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verification Card */}
        <div className="cyber-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-botCyan" />
            <span>Parametric Verification Proof</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Protection Product:</span>
              <span className="font-semibold text-white">
                {isPriceProtection ? "BOT Price Protection" : "BotLend Protection"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Trigger Threshold:</span>
              <span className="font-semibold text-white">
                {isPriceProtection
                  ? `BOT <= ${formatUSDPrice(policy.triggerValue)}`
                  : `Health Factor < ${(Number(policy.triggerValue) / 1e18).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Reported Oracle Reading:</span>
              <span className="font-bold text-botCyan">
                {isPriceProtection
                  ? formatUSDPrice(latestAnswer)
                  : `${(Number(botLendHealthFactor || 0n) / 1e18).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Trigger Met:</span>
              <span className={`font-semibold ${isEligible ? "text-emerald-400" : "text-slate-300"}`}>
                {isEligible ? "YES (Verified On-Chain)" : "NO"}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Settlement Card */}
        <div className="cyber-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins className="h-4 w-4 text-emerald-400" />
            <span>Financial Settlement</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Policy Coverage:</span>
              <span className="font-bold text-white">{formatBOT(policy.coverageAmount)} BOT</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Calculated Claim Payout:</span>
              <span className="font-bold text-emerald-400">
                {formatBOT(claimAmount as bigint | undefined)} BOT
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Claim Window Expiry:</span>
              <span className="font-medium text-slate-300">
                {policy.claimDeadline > 0n ? formatDate(policy.claimDeadline) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Settlement Status:</span>
              <span className="font-bold text-white">
                {policy.claimed ? "COMPLETED" : isEligible ? "CLAIMABLE" : "MONITORING"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
