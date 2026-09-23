"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Shield, Droplets, Wallet, ExternalLink, Menu, X, Coins, CheckCircle, Loader2 } from "lucide-react";
import { formatAddress } from "@/lib/identity";
import { formatBOT } from "@/lib/format";
import { CONTRACT_ADDRESSES, ERC20_ABI } from "@/config/contracts";

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  // Read BOT token balance
  const { data: botBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.botToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContractAsync } = useWriteContract();

  const handleFaucet = async () => {
    if (!address) return;
    try {
      setFaucetLoading(true);
      setFaucetSuccess(false);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.botToken,
        abi: ERC20_ABI,
        functionName: "faucet",
      });
      // Allow brief moment or confirmation
      setTimeout(() => {
        refetchBalance();
        setFaucetLoading(false);
        setFaucetSuccess(true);
        setTimeout(() => setFaucetSuccess(false), 4000);
      }, 2000);
    } catch (err) {
      console.error("Faucet error:", err);
      setFaucetLoading(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/products", label: "Protection" },
    { href: "/policies", label: "My Policies" },
    { href: "/pools", label: "Pools" },
    { href: "/claims", label: "Claims" },
    { href: "/liquidity", label: "Liquidity" },
    { href: "/admin", label: "Admin" },
    { href: "/developer", label: "Developers" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surfaceBorder bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-botCyan to-botBlue p-1.5 shadow-cyanGlow">
              <Shield className="h-full w-full text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                BotInsure
                <span className="rounded bg-botCyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-botCyan border border-botCyan/30">
                  MVP
                </span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 -mt-1">
                Parametric Protocol
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-botCyan bg-surfaceHover border border-botCyan/20"
                      : "text-slate-300 hover:text-white hover:bg-surface"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Network Indicator */}
          {isConnected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-surfaceBorder text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{chain?.name || "Botchain (968)"}</span>
            </div>
          )}

          {/* Faucet Button */}
          {isConnected && (
            <button
              onClick={handleFaucet}
              disabled={faucetLoading}
              title="Claim 1,000 BOT test tokens"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-botCyan/10 hover:bg-botCyan/20 text-botCyan border border-botCyan/30 transition-all shadow-sm"
            >
              {faucetLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : faucetSuccess ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Droplets className="h-3.5 w-3.5" />
              )}
              <span>{faucetLoading ? "Minting..." : faucetSuccess ? "+1,000 BOT!" : "Faucet (1k BOT)"}</span>
            </button>
          )}

          {/* Wallet Balance & Connect */}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-surfaceBorder text-xs">
                <Coins className="h-3.5 w-3.5 text-botCyan" />
                <span className="font-semibold text-white">{formatBOT(botBalance)}</span>
                <span className="text-slate-400 font-medium">BOT</span>
              </div>

              <button
                onClick={() => disconnect()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-surfaceBorder hover:border-rose-500/50 hover:text-rose-400 text-slate-200 transition-colors"
              >
                <Wallet className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatAddress(address)}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const connector = connectors[0];
                if (connector) connect({ connector });
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-botCyan to-botBlue hover:opacity-90 text-white shadow-cyanGlow transition-all"
            >
              <Wallet className="h-4 w-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-surfaceBorder bg-surface px-4 pt-2 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-surfaceHover hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-surfaceBorder flex flex-col gap-2">
            {isConnected ? (
              <>
                <div className="flex justify-between items-center text-xs text-slate-300 px-1">
                  <span>Balance:</span>
                  <span className="font-semibold text-botCyan">{formatBOT(botBalance)} BOT</span>
                </div>
                <button
                  onClick={handleFaucet}
                  disabled={faucetLoading}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-botCyan/15 text-botCyan border border-botCyan/30"
                >
                  {faucetLoading ? "Minting..." : "Claim 1,000 BOT Faucet"}
                </button>
                <button
                  onClick={() => disconnect()}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-surfaceHover text-slate-300"
                >
                  Disconnect ({formatAddress(address)})
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  const connector = connectors[0];
                  if (connector) connect({ connector });
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-botCyan to-botBlue text-white"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
