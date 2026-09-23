"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useWriteContract,
} from "wagmi";
import {
  Shield,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Zap,
  Coins,
  Loader2,
  Calendar,
  Activity,
  FileCheck,
} from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI, ORACLE_ABI, BOTLEND_ABI } from "@/config/contracts";
import { formatBOT, formatDate, formatUSDPrice, getStatusBadge } from "@/lib/format";
import { formatAddress } from "@/lib/identity";

export default function PolicyDetailPage() {
  const params = useParams();
  const policyId = BigInt((params.id as string) || "1");
  const { address, isConnected } = useAccount();

  // Load Policy Details
  const { data: policyData, isLoading: policyLoading, refetch: refetchPolicy } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPolicy",
    args: [policyId],
  });

  const policy = policyData as any;

  // Check Trigger Eligibility Live
  const { data: triggerCheckData, refetch: refetchTriggerCheck } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "checkPolicyTrigger",
    args: [policyId],
    query: { enabled: !!policy },
  });

  const [isEligible, triggerReason] = (triggerCheckData as [boolean, string]) || [false, ""];

  // Read Current Oracle Price for Product
  const { data: oracleFeedData } = useReadContract({
    address: CONTRACT_ADDRESSES.botOracle,
    abi: ORACLE_ABI,
    functionName: "getLatestAnswer",
    args: policy?.oracleFeedId ? [policy.oracleFeedId] : [1n],
    query: { enabled: !!policy && policy.productType === 0 },
  });

  const [latestAnswer, updatedAt] = (oracleFeedData as [bigint, bigint, bigint]) || [0n, 0n, 0n];

  // Read Current BotLend Health Factor if Lending Protection
  const { data: botLendHealthFactor } = useReadContract({
    address: CONTRACT_ADDRESSES.botLend,
    abi: BOTLEND_ABI,
    functionName: "getHealthFactor",
    args: policy?.referenceId ? [policy.referenceId] : undefined,
    query: { enabled: !!policy && policy.productType === 1 },
  });

  // Read Claim Payout Amount
  const { data: claimAmount } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getClaimAmount",
    args: [policyId],
    query: { enabled: !!policy },
  });

  // Action: Settle Claim
  const { writeContractAsync } = useWriteContract();
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSuccessHash, setSettleSuccessHash] = useState<string | null>(null);

  const handleSettleClaim = async () => {
    if (!address) return;
    try {
      setIsSettling(true);
      setSettleError(null);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.botInsure,
        abi: BOTINSURE_ABI,
        functionName: "settleClaim",
        args: [policyId],
      });
      setSettleSuccessHash(hash);
      setTimeout(async () => {
        await refetchPolicy();
        await refetchTriggerCheck();
        setIsSettling(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setSettleError(err.message || "Failed to settle claim");
      setIsSettling(false);
    }
  };

  if (policyLoading || !policy) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-botCyan animate-spin" />
        <p className="text-slate-400 text-sm">Loading policy record from Botchain...</p>
      </div>
    );
  }

  const badge = getStatusBadge(policy.status);
  const isPriceProtection = policy.productType === 0;
  const isHolder = address && policy.holder.toLowerCase() === address.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surfaceBorder pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Policy #{policy.policyId.toString()}</span>
            <span className={`cyber-badge ${badge.color}`}>{badge.label}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            {isPriceProtection ? "BOT Price Protection" : "BotLend Liquidation Protection"}
          </h1>
          <p className="text-xs text-slate-400">
            Holder: <span className="font-mono text-slate-300">{policy.holder}</span>
          </p>
        </div>

        {/* Claim Action Box */}
        {policy.status !== 3 && isHolder && isEligible && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleSettleClaim}
              disabled={isSettling}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-slate-950 font-extrabold text-sm shadow-cyanGlow transition-all disabled:opacity-50"
            >
              {isSettling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              <span>{isSettling ? "Settling Claim..." : "Settle Parametric Claim"}</span>
            </button>
            <span className="text-[10px] text-emerald-400 font-medium">
              Payout: {formatBOT(claimAmount as bigint | undefined)} BOT
            </span>
          </div>
        )}
      </div>

      {/* Settlement Success Notification */}
      {settleSuccessHash && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            <span>Parametric Claim Settled Successfully!</span>
          </div>
          <p className="text-xs text-slate-300">
            The payout has been disbursed to your wallet.
          </p>
          <a
            href={`https://scan.bohr.life/tx/${settleSuccessHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-botCyan hover:underline font-mono"
          >
            <span>View BohrScan Transaction: {settleSuccessHash.slice(0, 18)}...</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {settleError && (
        <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{settleError}</span>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coverage & Premium Card */}
        <div className="cyber-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-botCyan" />
            <span>Financial Specs</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Coverage Amount:</span>
              <span className="font-bold text-white">{formatBOT(policy.coverageAmount)} BOT</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Premium Paid:</span>
              <span className="font-semibold text-botCyan">{formatBOT(policy.premiumPaid, 4)} BOT</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Payout If Triggered:</span>
              <span className="font-bold text-emerald-400">
                {formatBOT(claimAmount as bigint | undefined)} BOT
              </span>
            </div>
            {policy.claimed && (
              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-surfaceBorder">
                <span>Claim Amount Paid:</span>
                <span className="font-bold text-blue-400">{formatBOT(policy.claimAmount)} BOT</span>
              </div>
            )}
          </div>
        </div>

        {/* Oracle & Trigger Condition Card */}
        <div className="cyber-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-botPurple" />
            <span>Live Oracle Monitoring</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Trigger Target:</span>
              <span className="font-semibold text-white">
                {isPriceProtection
                  ? `BOT <= ${formatUSDPrice(policy.triggerValue)}`
                  : `Health Factor < ${(Number(policy.triggerValue) / 1e18).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Current Live Reading:</span>
              <span className="font-bold text-botCyan">
                {isPriceProtection
                  ? formatUSDPrice(latestAnswer)
                  : `${(Number(botLendHealthFactor || 0n) / 1e18).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Eligibility Status:</span>
              <span className={`font-semibold ${isEligible ? "text-emerald-400" : "text-slate-300"}`}>
                {isEligible ? "Trigger Reached (Claimable)" : "Target Not Met"}
              </span>
            </div>
            {triggerReason && (
              <p className="text-[11px] text-slate-400 pt-1">
                Note: {triggerReason}
              </p>
            )}
          </div>
        </div>

        {/* Contract & Explorer Card */}
        <div className="cyber-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <FileCheck className="h-4 w-4 text-botBlue" />
            <span>On-Chain Verification</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Pool ID:</span>
              <span className="font-semibold text-white">Pool #{policy.poolId.toString()}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Policy Status:</span>
              <span className="font-semibold text-white">{badge.label}</span>
            </div>
            <div className="pt-2 border-t border-surfaceBorder space-y-2">
              <a
                href={`https://scan.bohr.life/address/${CONTRACT_ADDRESSES.botInsure}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-botCyan hover:underline text-[11px]"
              >
                <span>View Protocol on BohrScan</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://scan.bohr.life/address/${policy.holder}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-slate-400 hover:text-white text-[11px]"
              >
                <span>View Holder Address</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Timeline */}
      <div className="cyber-card rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-botCyan" />
          <span>Policy Lifecycle Timeline</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400">Created / Start</span>
            <p className="font-medium text-white">{formatDate(policy.startTime)}</p>
          </div>

          <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400">Coverage Expiry</span>
            <p className="font-medium text-white">{formatDate(policy.expiryTime)}</p>
          </div>

          <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400">Trigger Timestamp</span>
            <p className="font-medium text-white">
              {policy.claimTime > 0n ? formatDate(policy.claimTime) : "Pending Trigger"}
            </p>
          </div>

          <div className="rounded-xl bg-surface p-3 border border-surfaceBorder space-y-1">
            <span className="text-[10px] text-slate-400">Claim Window Deadline</span>
            <p className="font-medium text-white">
              {policy.claimDeadline > 0n ? formatDate(policy.claimDeadline) : "7 Days Post Trigger"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
