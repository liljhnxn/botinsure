"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Layers,
  Percent,
  Clock,
  Zap,
  Info,
} from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI, ERC20_ABI } from "@/config/contracts";
import { formatBOT, formatDuration, formatUSDPrice } from "@/lib/format";

export default function ProtectPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const productId = BigInt((params.productId as string) || "1");

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // Load product specs from contract
  const { data: productData, isLoading: productLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getProduct",
    args: [productId],
  });

  const product = productData as any;

  // Form State
  const [coverageInput, setCoverageInput] = useState<string>("1000");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [referenceAddress, setReferenceAddress] = useState<string>("");

  useEffect(() => {
    if (address && !referenceAddress) {
      setReferenceAddress(address);
    }
  }, [address, referenceAddress]);

  // Derived BigInts
  const parsedCoverage = (() => {
    try {
      const val = parseFloat(coverageInput);
      return isNaN(val) || val <= 0 ? 0n : parseEther(val.toString());
    } catch {
      return 0n;
    }
  })();

  const parsedDuration = BigInt(durationDays * 86400);

  // Available Pool Liquidity
  const { data: availableLiquidity } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getAvailablePoolLiquidity",
    args: product ? [product.poolId] : undefined,
    query: { enabled: !!product },
  });

  // Calculate Premium on-chain via view function
  const { data: premiumData } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPremium",
    args: [productId, parsedCoverage, parsedDuration],
    query: { enabled: parsedCoverage > 0n && parsedDuration > 0n },
  });

  const [totalPremium, protocolFee, poolPremium] = (premiumData as [bigint, bigint, bigint]) || [0n, 0n, 0n];

  // User BOT Balance & Allowance
  const { data: botBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.botToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.botToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.botInsure] : undefined,
    query: { enabled: !!address },
  });

  // Transaction execution
  const { writeContractAsync } = useWriteContract();
  const [isApproving, setIsApproving] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);

  const needsApproval = allowance !== undefined && totalPremium > 0n && allowance < totalPremium;

  const handleApprove = async () => {
    if (!address) return;
    try {
      setIsApproving(true);
      setTxError(null);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.botToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.botInsure, parseEther("1000000")],
      });
      // Short delay for mining
      setTimeout(async () => {
        await refetchAllowance();
        setIsApproving(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setTxError(err.message || "Approval transaction failed");
      setIsApproving(false);
    }
  };

  const handleBuy = async () => {
    if (!address) return;
    try {
      setIsBuying(true);
      setTxError(null);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.botInsure,
        abi: BOTINSURE_ABI,
        functionName: "buyProtection",
        args: [
          productId,
          parsedCoverage,
          parsedDuration,
          (referenceAddress as `0x${string}`) || address,
        ],
      });
      setTxSuccessHash(hash);
      setIsBuying(false);
    } catch (err: any) {
      console.error(err);
      setTxError(err.message || "Purchase transaction failed");
      setIsBuying(false);
    }
  };

  if (productLoading || !product) {
    return (
      <div className="max-w-3xl mx-auto py-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-botCyan animate-spin" />
        <p className="text-slate-400 text-sm">Loading protection product parameters...</p>
      </div>
    );
  }

  const isPriceProtection = product.productType === 0;
  const payoutBps = Number(product.payoutBps);
  const expectedPayout = (parsedCoverage * BigInt(payoutBps)) / 10000n;
  const hasInsufficientBalance = botBalance !== undefined && totalPremium > botBalance;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-botCyan/15 text-botCyan border border-botCyan/30">
            {isPriceProtection ? "BOT Price Protection" : "BotLend Liquidation Protection"}
          </span>
          <span className="text-xs text-slate-400">Product #{product.id.toString()}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">{product.name}</h1>
        <p className="text-slate-300 text-sm leading-relaxed">{product.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-card rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-botCyan" />
              <span>Configure Policy Parameters</span>
            </h2>

            {/* Coverage Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium">Requested Coverage Amount (BOT)</label>
                <span className="text-slate-400">
                  Range: {formatBOT(product.minCoverage)} - {formatBOT(product.maxCoverage)} BOT
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={coverageInput}
                  onChange={(e) => setCoverageInput(e.target.value)}
                  placeholder="1000"
                  className="w-full rounded-xl bg-surface border border-surfaceBorder px-4 py-3 text-white font-semibold text-lg focus:outline-none focus:border-botCyan transition-colors pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  BOT
                </span>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium">Policy Duration</label>
                <span className="text-slate-400">Max: {formatDuration(product.maxDuration)}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[7, 14, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      durationDays === days
                        ? "bg-botCyan/20 text-botCyan border-botCyan"
                        : "bg-surface text-slate-300 border-surfaceBorder hover:border-slate-500"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* BotLend Target Position Address (if applicable) */}
            {!isPriceProtection && (
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-medium">
                  BotLend Target Account Address (To Monitor Health Factor)
                </label>
                <input
                  type="text"
                  value={referenceAddress}
                  onChange={(e) => setReferenceAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-xl bg-surface border border-surfaceBorder px-4 py-2.5 text-xs text-white focus:outline-none focus:border-botCyan font-mono"
                />
              </div>
            )}

            {/* Policy Terms Summary Box */}
            <div className="rounded-xl border border-surfaceBorder bg-surface/60 p-4 space-y-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Info className="h-4 w-4 text-botCyan" />
                <span>Parametric Policy Terms & Trigger Rules</span>
              </div>
              <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc pl-4">
                <li>
                  <strong>Trigger Condition:</strong>{" "}
                  {isPriceProtection
                    ? `Policy activates if BotOracle reports BOT at or below ${formatUSDPrice(product.triggerValue)}`
                    : `Policy activates if BotLend position health factor drops below ${(Number(product.triggerValue) / 1e18).toFixed(2)}`}
                </li>
                <li>
                  <strong>Payout Factor:</strong> {(payoutBps / 100).toFixed(0)}% of coverage (
                  {formatBOT(expectedPayout)} BOT) settled directly to your wallet upon trigger.
                </li>
                <li>
                  <strong>Claim Window:</strong> 7 days after trigger activation to settle payout.
                </li>
                <li>
                  <strong>Deterministic Settlement:</strong> Autonomous contract settlement with zero manual adjusters.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pricing & Checkout Column */}
        <div className="space-y-6">
          <div className="cyber-card rounded-2xl p-6 space-y-6">
            <h3 className="text-base font-bold text-white">Coverage Breakdown</h3>

            <div className="space-y-3 text-xs border-b border-surfaceBorder pb-4">
              <div className="flex justify-between items-center text-slate-400">
                <span>Coverage Requested</span>
                <span className="font-semibold text-white">{formatBOT(parsedCoverage)} BOT</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Duration</span>
                <span className="font-semibold text-white">{durationDays} Days</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Expected Payout</span>
                <span className="font-semibold text-emerald-400">{formatBOT(expectedPayout)} BOT</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Pool Available Liquidity</span>
                <span className="font-semibold text-white">
                  {formatBOT(availableLiquidity as bigint | undefined)} BOT
                </span>
              </div>
            </div>

            {/* Calculated Premium */}
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Total Premium to Pay</span>
              <div className="text-3xl font-extrabold text-botCyan flex items-baseline gap-1">
                <span>{formatBOT(totalPremium, 4)}</span>
                <span className="text-xs text-slate-400 font-normal">BOT</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Includes 5% protocol fee ({formatBOT(protocolFee, 4)} BOT) + pool underwriting reserve (
                {formatBOT(poolPremium, 4)} BOT).
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {!isConnected ? (
                <div className="rounded-xl border border-surfaceBorder bg-surface p-4 text-center space-y-3">
                  <p className="text-xs text-slate-300">Wallet connection required to purchase coverage.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const connector = connectors[0];
                      if (connector) connect({ connector });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-botCyan to-botBlue text-white font-bold text-xs shadow-cyanGlow hover:opacity-95 transition-all"
                  >
                    <span>Connect Wallet</span>
                  </button>
                </div>
              ) : txSuccessHash ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle className="h-5 w-5" />
                    <span>Protection Purchased!</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Your policy is now active on Botchain.
                  </p>
                  <Link
                    href="/policies"
                    className="block w-full text-center py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    View My Policies &rarr;
                  </Link>
                </div>
              ) : needsApproval ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border border-botCyan text-botCyan font-bold text-sm hover:bg-botCyan/15 transition-all shadow-sm"
                >
                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  <span>{isApproving ? "Approving BOT..." : "Step 1: Approve BOT"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={isBuying || hasInsufficientBalance || parsedCoverage === 0n}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-botCyan to-botBlue text-white font-bold text-sm hover:opacity-95 shadow-cyanGlow transition-all disabled:opacity-50"
                >
                  {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  <span>
                    {isBuying
                      ? "Purchasing Policy..."
                      : hasInsufficientBalance
                      ? "Insufficient BOT Balance"
                      : "Buy Protection"}
                  </span>
                </button>
              )}

              {txError && (
                <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{txError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
