"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useConnect,
  useSwitchChain,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import {
  Layers,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Lock,
  Percent,
  Wallet,
  Droplets,
  ExternalLink,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI, ERC20_ABI } from "@/config/contracts";
import { formatBOT } from "@/lib/format";

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = BigInt((params.id as string) || "1");
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();

  // Load Pool Info
  const { data: poolData, isLoading: poolLoading, refetch: refetchPool } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPool",
    args: [poolId],
  });

  const pool = poolData as any;

  // Load Pool Stats
  const { data: poolStatsData, refetch: refetchStats } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getPoolStats",
    args: [poolId],
  });

  const [totalLiquidity, availableLiquidity, activePolicies, premiumsCollected, claimsPaid, lockedCoverage] =
    (poolStatsData as [bigint, bigint, bigint, bigint, bigint, bigint]) || [0n, 0n, 0n, 0n, 0n, 0n];

  // User Liquidity in this pool
  const { data: userLiquidityData, refetch: refetchUserLiquidity } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getUserLiquidity",
    args: address ? [address, poolId] : undefined,
    query: { enabled: !!address },
  });

  const [userShares, userBotAmount] = (userLiquidityData as [bigint, bigint]) || [0n, 0n];

  // User BOT Balance & Allowance
  const { data: botBalance, refetch: refetchBalance } = useReadContract({
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

  // Action Tabs: Deposit vs Withdraw
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [depositAmount, setDepositAmount] = useState<string>("500");
  const [withdrawShares, setWithdrawShares] = useState<string>("");

  const { writeContractAsync } = useWriteContract();
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const parsedDeposit = (() => {
    try {
      const val = parseFloat(depositAmount);
      return isNaN(val) || val <= 0 ? 0n : parseEther(val.toString());
    } catch {
      return 0n;
    }
  })();

  const parsedWithdraw = (() => {
    try {
      const val = parseFloat(withdrawShares);
      return isNaN(val) || val <= 0 ? 0n : parseEther(val.toString());
    } catch {
      return 0n;
    }
  })();

  const userBotBalanceVal = botBalance ?? 0n;
  const isInsufficientBot = parsedDeposit > userBotBalanceVal;
  const needsApproval = allowance !== undefined && parsedDeposit > 0n && allowance < parsedDeposit;

  // In-page Faucet
  const handleFaucet = async () => {
    if (!address) return;
    try {
      setIsFaucetLoading(true);
      setActionError(null);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.botToken,
        abi: ERC20_ABI,
        functionName: "faucet",
      });
      setTimeout(async () => {
        await refetchBalance();
        setIsFaucetLoading(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Faucet claim failed");
      setIsFaucetLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!address) {
      const connector = connectors[0];
      if (connector) connect({ connector });
      return;
    }
    try {
      setIsApproving(true);
      setActionError(null);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.botToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.botInsure, parseEther("10000000")],
      });
      setTimeout(async () => {
        await refetchAllowance();
        setIsApproving(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Approval failed");
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!address) {
      const connector = connectors[0];
      if (connector) connect({ connector });
      return;
    }
    if (parsedDeposit === 0n) {
      setActionError("Please enter a valid deposit amount greater than 0");
      return;
    }
    if (isInsufficientBot) {
      setActionError("Deposit amount exceeds your current BOT balance. Claim test tokens via the faucet.");
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      setActionSuccess(null);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.botInsure,
        abi: BOTINSURE_ABI,
        functionName: "provideLiquidity",
        args: [poolId, parsedDeposit],
      });
      setActionSuccess(hash);
      setTimeout(async () => {
        await refetchPool();
        await refetchStats();
        await refetchUserLiquidity();
        await refetchBalance();
        setIsSubmitting(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Deposit transaction failed");
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address) {
      const connector = connectors[0];
      if (connector) connect({ connector });
      return;
    }
    if (parsedWithdraw === 0n) {
      setActionError("Please enter the number of pool shares to burn");
      return;
    }
    if (parsedWithdraw > userShares) {
      setActionError("Withdrawal amount exceeds your current pool shares balance");
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      setActionSuccess(null);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.botInsure,
        abi: BOTINSURE_ABI,
        functionName: "withdrawLiquidity",
        args: [poolId, parsedWithdraw],
      });
      setActionSuccess(hash);
      setTimeout(async () => {
        await refetchPool();
        await refetchStats();
        await refetchUserLiquidity();
        await refetchBalance();
        setIsSubmitting(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Withdrawal failed");
      setIsSubmitting(false);
    }
  };

  const isWrongNetwork = isConnected && chain?.id !== 968 && chain?.id !== 31337;

  if (poolLoading || !pool) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-botCyan animate-spin" />
        <p className="text-slate-400 text-sm">Loading protection pool reserves and state...</p>
      </div>
    );
  }

  const utilizationPct =
    totalLiquidity > 0n ? ((Number(lockedCoverage) * 100) / Number(totalLiquidity)).toFixed(1) : "0.0";

  // Estimated BOT redemption for withdrawal
  const estimatedWithdrawBot =
    userShares > 0n && userBotAmount > 0n && parsedWithdraw > 0n
      ? (parsedWithdraw * userBotAmount) / userShares
      : 0n;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surfaceBorder pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Underwriting Pool #{pool.id.toString()}</span>
            <span className="cyber-badge bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              Active & Solvent
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">{pool.name}</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Share Token Contract:</span>
            <a
              href={`https://scan.bohr.life/address/${pool.shareToken}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-botCyan hover:underline inline-flex items-center gap-1"
            >
              <span>{pool.shareToken}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pools"
            className="px-3.5 py-1.5 rounded-xl bg-surface border border-surfaceBorder hover:border-botCyan text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            All Pools
          </Link>
          <Link
            href="/liquidity"
            className="px-3.5 py-1.5 rounded-xl bg-surface border border-botCyan/30 text-botCyan hover:bg-botCyan/15 text-xs font-semibold transition-all"
          >
            My LP Portfolio
          </Link>
        </div>
      </div>

      {/* Network Warning Banner */}
      {isWrongNetwork && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <span>You are connected to an unsupported network. Please switch to Botchain Testnet (Chain ID 968).</span>
          </div>
          <button
            onClick={() => switchChain({ chainId: 968 })}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all shrink-0"
          >
            Switch to Botchain
          </button>
        </div>
      )}

      {/* User Position Banner */}
      {isConnected && (
        <div className="rounded-2xl border border-surfaceBorder bg-gradient-to-r from-surface to-surfaceHover p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">My Position In This Pool</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white">{formatBOT(userBotAmount)}</span>
              <span className="text-xs text-slate-400">BOT value</span>
            </div>
            <p className="text-xs text-botCyan font-medium mt-0.5">
              {formatBOT(userShares)} LP share tokens ({pool.shareToken ? "biBOT-LP" : "shares"})
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {userShares > 0n ? (
              <button
                onClick={() => {
                  setActiveTab("withdraw");
                  setWithdrawShares(formatEther(userShares));
                }}
                className="px-3.5 py-2 rounded-xl bg-surface border border-surfaceBorder hover:border-botCyan text-slate-200 hover:text-botCyan text-xs font-semibold transition-all"
              >
                Withdraw All Shares
              </button>
            ) : (
              <button
                onClick={() => {
                  setActiveTab("deposit");
                  setDepositAmount("500");
                }}
                className="px-3.5 py-2 rounded-xl bg-botCyan/15 border border-botCyan/30 text-botCyan text-xs font-semibold hover:bg-botCyan/25 transition-all"
              >
                Deposit to Earn
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pool Metrics Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cyber-card rounded-2xl p-6 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-botCyan" />
              <span>Pool Reserve & Solvency Architecture</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
                <span className="text-[10px] text-slate-400">Total Underwritten Assets</span>
                <p className="text-base font-bold text-white">{formatBOT(totalLiquidity)} BOT</p>
              </div>

              <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
                <span className="text-[10px] text-slate-400">Available to Underwrite</span>
                <p className="text-base font-bold text-emerald-400">{formatBOT(availableLiquidity)} BOT</p>
              </div>

              <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
                <span className="text-[10px] text-slate-400">Locked Coverage (Obligations)</span>
                <p className="text-base font-bold text-amber-400">{formatBOT(lockedCoverage)} BOT</p>
              </div>

              <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
                <span className="text-[10px] text-slate-400">Capacity Utilization</span>
                <p className="text-base font-bold text-botCyan">{utilizationPct}%</p>
              </div>

              <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
                <span className="text-[10px] text-slate-400">Premiums Accrued to LPs</span>
                <p className="text-base font-bold text-botPurple">{formatBOT(premiumsCollected, 4)} BOT</p>
              </div>

              <div className="rounded-xl bg-surface p-3.5 border border-surfaceBorder space-y-1">
                <span className="text-[10px] text-slate-400">Claims Settled</span>
                <p className="text-base font-bold text-slate-300">{formatBOT(claimsPaid)} BOT</p>
              </div>
            </div>

            {/* Solvency Lock Mechanism Description */}
            <div className="rounded-xl border border-surfaceBorder bg-surface/50 p-4 space-y-2 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-botCyan" /> Automated Solvency Lock
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The smart contract prevents any withdrawal that would compromise active policy obligations. If total pool net assets minus the withdrawal is less than locked coverage (<code>poolNet - withdraw &lt; lockedCoverage</code>), the transaction is rejected automatically to safeguard policyholders.
              </p>
            </div>

            {/* Variable Return Disclaimer */}
            <div className="rounded-xl border border-surfaceBorder bg-surface/50 p-4 space-y-2 text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-400" /> Variable Return Notice
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Liquidity provider returns are <strong>variable and depend on premiums, claims, fees, and pool performance</strong>.
                There is no fixed or guaranteed APY. When users buy protection, 95% of premiums accrue directly to the pool, increasing the underlying BOT value of each share.
              </p>
            </div>
          </div>
        </div>

        {/* Deposit / Withdraw Action Box */}
        <div className="space-y-6">
          <div className="cyber-card rounded-2xl p-6 space-y-6">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-surface rounded-xl p-1 border border-surfaceBorder">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("deposit");
                  setActionError(null);
                  setActionSuccess(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "deposit"
                    ? "bg-botCyan text-slate-950 font-bold shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Deposit BOT
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("withdraw");
                  setActionError(null);
                  setActionSuccess(null);
                  if (userShares > 0n && !withdrawShares) {
                    setWithdrawShares(formatEther(userShares));
                  }
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "withdraw"
                    ? "bg-botCyan text-slate-950 font-bold shadow-sm"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Withdraw
              </button>
            </div>

            {/* Faucet helper banner when balance is low */}
            {isConnected && userBotBalanceVal === 0n && (
              <div className="rounded-xl border border-botCyan/30 bg-botCyan/10 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-botCyan font-semibold">
                  <Droplets className="h-4 w-4 shrink-0" />
                  <span>Your BOT Balance is 0</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Claim 1,000 free testnet BOT tokens to test depositing underwriting liquidity.
                </p>
                <button
                  type="button"
                  onClick={handleFaucet}
                  disabled={isFaucetLoading}
                  className="w-full py-2 rounded-lg bg-botCyan text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-cyan-300 transition-all shadow-sm"
                >
                  {isFaucetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Droplets className="h-3.5 w-3.5" />}
                  <span>{isFaucetLoading ? "Minting Test BOT..." : "Claim 1,000 Test BOT"}</span>
                </button>
              </div>
            )}

            {activeTab === "deposit" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-slate-300 font-medium">Deposit Amount</label>
                    <span className="text-slate-400">
                      Balance: <strong className="text-white">{formatBOT(botBalance)}</strong> BOT
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="500"
                      min="1"
                      className="w-full rounded-xl bg-surface border border-surfaceBorder px-4 py-3 text-white font-bold text-base focus:outline-none focus:border-botCyan pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      BOT
                    </span>
                  </div>

                  {/* Quick percentage buttons */}
                  {userBotBalanceVal > 0n && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const val = (userBotBalanceVal * BigInt(Math.floor(pct * 100))) / 100n;
                            setDepositAmount(formatEther(val));
                          }}
                          className="flex-1 py-1 rounded-md bg-surface border border-surfaceBorder text-[10px] font-semibold text-slate-400 hover:text-botCyan hover:border-botCyan/40 transition-colors"
                        >
                          {pct === 1.0 ? "MAX" : `${pct * 100}%`}
                        </button>
                      ))}
                    </div>
                  )}

                  {isInsufficientBot && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1 pt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>Deposit amount exceeds your current BOT balance.</span>
                    </p>
                  )}
                </div>

                {!isConnected ? (
                  <button
                    type="button"
                    onClick={() => {
                      const connector = connectors[0];
                      if (connector) connect({ connector });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-botCyan to-botBlue text-white font-bold text-sm hover:opacity-95 shadow-cyanGlow transition-all"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet to Deposit</span>
                  </button>
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
                    onClick={handleDeposit}
                    disabled={isSubmitting || parsedDeposit === 0n || isInsufficientBot}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-botCyan to-botBlue text-white font-bold text-sm hover:opacity-95 shadow-cyanGlow transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                    <span>
                      {isSubmitting
                        ? "Depositing..."
                        : isInsufficientBot
                        ? "Insufficient BOT Balance"
                        : "Deposit Liquidity"}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {userShares === 0n ? (
                  <div className="rounded-xl border border-surfaceBorder bg-surface/50 p-4 text-center space-y-3 text-xs">
                    <p className="text-slate-300 font-medium">You don&apos;t hold any LP shares in this pool yet.</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Deposit BOT into this pool first to receive share tokens and begin earning variable protocol premiums.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("deposit")}
                      className="w-full py-2 rounded-lg bg-botCyan/15 border border-botCyan/30 text-botCyan font-semibold hover:bg-botCyan/25 transition-all"
                    >
                      Switch to Deposit BOT
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <label className="text-slate-300 font-medium">Pool Shares to Burn</label>
                        <span className="text-slate-400">
                          Owned: <strong className="text-white">{formatBOT(userShares)}</strong>
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={withdrawShares}
                          onChange={(e) => setWithdrawShares(e.target.value)}
                          placeholder="100"
                          min="1"
                          className="w-full rounded-xl bg-surface border border-surfaceBorder px-4 py-3 text-white font-bold text-base focus:outline-none focus:border-botCyan pr-20"
                        />
                        <button
                          type="button"
                          onClick={() => setWithdrawShares(formatEther(userShares))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surfaceBorder hover:bg-botCyan/20 hover:text-botCyan text-[10px] font-bold text-slate-300 transition-colors"
                        >
                          MAX
                        </button>
                      </div>

                      {/* Quick percentage buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              const val = (userShares * BigInt(Math.floor(pct * 100))) / 100n;
                              setWithdrawShares(formatEther(val));
                            }}
                            className="flex-1 py-1 rounded-md bg-surface border border-surfaceBorder text-[10px] font-semibold text-slate-400 hover:text-botCyan hover:border-botCyan/40 transition-colors"
                          >
                            {pct === 1.0 ? "MAX" : `${pct * 100}%`}
                          </button>
                        ))}
                      </div>

                      {estimatedWithdrawBot > 0n && (
                        <p className="text-[11px] text-slate-400 pt-1 flex justify-between">
                          <span>Estimated BOT Payout:</span>
                          <span className="font-bold text-emerald-400">~{formatBOT(estimatedWithdrawBot)} BOT</span>
                        </p>
                      )}
                    </div>

                    {!isConnected ? (
                      <button
                        type="button"
                        onClick={() => {
                          const connector = connectors[0];
                          if (connector) connect({ connector });
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-surface border border-botCyan text-botCyan font-bold text-sm hover:bg-botCyan/15 transition-all"
                      >
                        <Wallet className="h-4 w-4" />
                        <span>Connect Wallet to Withdraw</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleWithdraw}
                        disabled={isSubmitting || parsedWithdraw === 0n || parsedWithdraw > userShares}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-surface border border-surfaceBorder hover:border-botCyan text-slate-200 font-bold text-sm transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
                        <span>
                          {isSubmitting
                            ? "Withdrawing..."
                            : parsedWithdraw === 0n
                            ? "Enter Share Amount"
                            : parsedWithdraw > userShares
                            ? "Exceeds Owned Shares"
                            : "Withdraw Liquidity"}
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {actionSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Transaction Confirmed!</span>
                </div>
                <a
                  href={`https://scan.bohr.life/tx/${actionSuccess}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-botCyan hover:underline flex items-center gap-1"
                >
                  <span>View on Bohr Scan &rarr;</span>
                </a>
              </div>
            )}

            {actionError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="break-all">{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-rose-400 hover:text-white font-bold ml-2 text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
