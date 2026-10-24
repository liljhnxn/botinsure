"use client";

import React, { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseEther, parseUnits } from "viem";
import {
  ShieldAlert,
  Sliders,
  Play,
  Pause,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Coins,
} from "lucide-react";
import { CONTRACT_ADDRESSES, BOTINSURE_ABI, ORACLE_ABI, BOTLEND_ABI } from "@/config/contracts";
import { formatUSDPrice } from "@/lib/format";

export default function AdminPage() {
  const { address, isConnected } = useAccount();

  // Read Protocol State
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "paused",
  });

  const { data: riskParams, refetch: refetchRisk } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getRiskParameters",
  });

  const { data: oracleConfig, refetch: refetchOracleConfig } = useReadContract({
    address: CONTRACT_ADDRESSES.botInsure,
    abi: BOTINSURE_ABI,
    functionName: "getOracleConfig",
  });

  // Current Oracle Price
  const { data: oracleData, refetch: refetchOraclePrice } = useReadContract({
    address: CONTRACT_ADDRESSES.botOracle,
    abi: ORACLE_ABI,
    functionName: "getLatestAnswer",
    args: [1n],
  });

  const [currentPrice] = (oracleData as [bigint, bigint, bigint]) || [0n, 0n, 0n];

  // Forms
  const [newFeeBps, setNewFeeBps] = useState<string>("500");
  const [newWindowDays, setNewWindowDays] = useState<string>("7");
  const [simPriceUSD, setSimPriceUSD] = useState<string>("0.65");
  const [simHealthFactor, setSimHealthFactor] = useState<string>("0.85");
  const [targetUser, setTargetUser] = useState<string>("");

  const { writeContractAsync } = useWriteContract();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTogglePause = async () => {
    try {
      setIsLoading(true);
      setStatusMsg(null);
      if (isPaused) {
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.botInsure,
          abi: BOTINSURE_ABI,
          functionName: "unpause",
        });
        setStatusMsg("Protocol Unpaused Successfully!");
      } else {
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.botInsure,
          abi: BOTINSURE_ABI,
          functionName: "pause",
        });
        setStatusMsg("Protocol Paused Successfully!");
      }
      setTimeout(async () => {
        await refetchPaused();
        setIsLoading(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Error: ${err.message || "Action failed"}`);
      setIsLoading(false);
    }
  };

  const handleUpdateFee = async () => {
    try {
      setIsLoading(true);
      setStatusMsg(null);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.botInsure,
        abi: BOTINSURE_ABI,
        functionName: "setProtocolFeeBps",
        args: [BigInt(newFeeBps)],
      });
      setStatusMsg("Protocol Fee Updated!");
      setTimeout(async () => {
        await refetchRisk();
        setIsLoading(false);
      }, 2000);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleSimulatePrice = async () => {
    try {
      setIsLoading(true);
      setStatusMsg(null);
      // BOT/USD uses 8 decimals
      const priceRaw = BigInt(Math.round(parseFloat(simPriceUSD) * 1e8));
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.botOracle,
        abi: ORACLE_ABI,
        functionName: "setPrice",
        args: [1n, priceRaw],
      });
      setStatusMsg(`MockBotOracle price updated to $${simPriceUSD}!`);
      setTimeout(async () => {
        await refetchOraclePrice();
        setIsLoading(false);
      }, 2000);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleSimulateHealthFactor = async () => {
    if (!address) return;
    try {
      setIsLoading(true);
      setStatusMsg(null);
      const target = (targetUser || address) as `0x${string}`;
      const hfRaw = parseUnits(simHealthFactor, 18);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.botLend,
        abi: BOTLEND_ABI,
        functionName: "setHealthFactor",
        args: [target, hfRaw],
      });
      setStatusMsg(`MockBotLend position health factor updated to ${simHealthFactor}!`);
      setIsLoading(false);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const currentFee = riskParams ? (Number((riskParams as any).protocolFeeBps) / 100).toFixed(1) : "5.0";
  const currentWindow = riskParams ? Number((riskParams as any).claimWindowDuration) / 86400 : 7;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-botPurple/30 bg-botPurple/10 px-3 py-1 text-xs font-semibold text-botPurple">
          <Sliders className="h-3.5 w-3.5" />
          <span>Governance & Protocol Administration</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Admin Control Center
        </h1>
        <p className="text-slate-400 text-sm">
          Configure risk parameters, toggle emergency pauses, and simulate oracle triggers for testing.
        </p>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-botCyan/30 bg-botCyan/10 p-4 text-xs text-botCyan flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Grid: Admin Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Protocol Emergency State */}
        <div className="cyber-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Emergency Protocol Pause</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            When paused, new policy purchases and liquidity deposits are restricted.
            Safe claim payouts and policy inquiries remain accessible.
          </p>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-surfaceBorder text-xs">
            <span className="text-slate-400">Current Protocol Status:</span>
            <span className={`font-bold ${isPaused ? "text-rose-400" : "text-emerald-400"}`}>
              {isPaused ? "PAUSED" : "OPERATIONAL"}
            </span>
          </div>

          <button
            onClick={handleTogglePause}
            disabled={isLoading || !isConnected}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              isPaused
                ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
            <span>{isPaused ? "Unpause Protocol" : "Pause Protocol"}</span>
          </button>
        </div>

        {/* Risk & Fee Configuration */}
        <div className="cyber-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-botCyan" />
            <span>Risk & Fee Configuration</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <label>Protocol Fee Rate (basis points)</label>
                <span>Current: {currentFee}% ({((riskParams as any)?.protocolFeeBps ?? 500n).toString()} bps)</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newFeeBps}
                  onChange={(e) => setNewFeeBps(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-xl bg-surface border border-surfaceBorder px-3 py-2 text-white text-xs focus:outline-none focus:border-botCyan"
                />
                <button
                  onClick={handleUpdateFee}
                  disabled={isLoading || !isConnected}
                  className="px-4 py-2 rounded-xl bg-surface border border-surfaceBorder hover:border-botCyan text-slate-200 font-bold shrink-0"
                >
                  Update
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-surfaceBorder text-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Claim Window:</span>
                <span className="font-semibold text-white">{currentWindow} Days</span>
              </div>
              <div className="flex justify-between">
                <span>BotOracle Max Age:</span>
                <span className="font-semibold text-white">
                  {((oracleConfig as any)?.maxOracleAge ?? 3600n).toString()} seconds
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Section for Parametric Controls */}
      <div className="cyber-card rounded-2xl p-6 space-y-6">
        <div className="flex flex-col gap-1 border-b border-surfaceBorder pb-4">
          <div className="inline-flex items-center gap-1.5 text-botCyan text-xs font-semibold">
            <Zap className="h-4 w-4" />
            <span>Parametric Trigger Control & Testing</span>
          </div>
          <h2 className="text-xl font-bold text-white">Trigger Simulation Control</h2>
          <p className="text-xs text-slate-400">
            Monitor and test live oracle price feeds and lending health factor parameters to verify automated parametric claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Oracle Price Simulator */}
          <div className="rounded-xl border border-surfaceBorder bg-surface/50 p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-botCyan" /> BOT/USD Price Feed (Feed #1)
              </span>
              <span className="text-botCyan font-bold">
                Live: {formatUSDPrice(currentPrice)}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">New BOT Price (USD)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={simPriceUSD}
                  onChange={(e) => setSimPriceUSD(e.target.value)}
                  placeholder="0.65"
                  className="w-full rounded-xl bg-surface border border-surfaceBorder px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-botCyan"
                />
                <button
                  onClick={handleSimulatePrice}
                  disabled={isLoading || !isConnected}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-botCyan to-botBlue text-white font-bold text-xs shrink-0 hover:opacity-90"
                >
                  Set Price
                </button>
              </div>
              <span className="text-[10px] text-slate-400">
                Tip: Set price &lt;= $0.70 to satisfy the BOT Price Protection trigger condition.
              </span>
            </div>
          </div>

          {/* BotLend Health Factor Simulator */}
          <div className="rounded-xl border border-surfaceBorder bg-surface/50 p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-botPurple" /> BotLend Health Factor
              </span>
              <span className="text-slate-400 text-[10px]">1.00 = Liquidation Threshold</span>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Target Address (Defaults to connected account)</label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder={address || "0x..."}
                  className="w-full rounded-xl bg-surface border border-surfaceBorder px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-botCyan"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.05"
                  value={simHealthFactor}
                  onChange={(e) => setSimHealthFactor(e.target.value)}
                  placeholder="0.85"
                  className="w-full rounded-xl bg-surface border border-surfaceBorder px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-botCyan"
                />
                <button
                  onClick={handleSimulateHealthFactor}
                  disabled={isLoading || !isConnected}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-botPurple to-botBlue text-white font-bold text-xs shrink-0 hover:opacity-90"
                >
                  Set Health Factor
                </button>
              </div>
              <span className="text-[10px] text-slate-400">
                Tip: Set health factor &lt; 1.00 to activate the BotLend Protection trigger.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
