import React from "react";
import Link from "next/link";
import { Shield, ExternalLink, AlertTriangle, Globe, Compass, Cpu, Layers } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-surfaceBorder bg-background/95 pt-12 pb-10 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* BOT Chain Ecosystem Showcase Section */}
        <div className="rounded-2xl border border-surfaceBorder bg-surface/50 p-6 sm:p-8 backdrop-blur-md space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-surfaceBorder/60">
            {/* BOT Chain Identity */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/60 border border-emerald-500/30 p-1.5 shadow-cyanGlow">
                {/* BOT Chain Official Logo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/botchain-logo.png"
                  alt="BOT Chain Logo"
                  className="h-full w-full rounded-lg object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-white tracking-tight">BOT Chain</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    Mainnet Live
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Next-generation AI & EVM-compatible blockchain powering deterministic on-chain applications.
                </p>
              </div>
            </div>

            {/* Required Ecosystem Links with Logo at Front */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://botchain.ai"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-botCyan/15 hover:from-emerald-500/25 hover:to-botCyan/25 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all shadow-sm group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/botchain-logo.png"
                  alt="BOT Chain"
                  className="h-4 w-4 rounded-full object-cover shrink-0 group-hover:scale-110 transition-transform"
                />
                <span>BOT Chain Website</span>
                <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
              </a>

              <a
                href="https://scan.botchain.ai"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-surfaceBorder hover:border-emerald-500/50 text-slate-200 hover:text-white font-semibold text-xs transition-all shadow-sm group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/botchain-logo.png"
                  alt="BOT Chain"
                  className="h-4 w-4 rounded-full object-cover shrink-0 group-hover:scale-110 transition-transform"
                />
                <span>BOT Chain Explorer</span>
                <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
              </a>
            </div>
          </div>

          {/* Network Specifications Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="rounded-xl bg-background/60 border border-surfaceBorder/80 p-3.5 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Network</span>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                BOT Chain Mainnet
              </p>
            </div>

            <div className="rounded-xl bg-background/60 border border-surfaceBorder/80 p-3.5 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Chain ID</span>
              <p className="font-mono font-bold text-botCyan">677</p>
            </div>

            <div className="rounded-xl bg-background/60 border border-surfaceBorder/80 p-3.5 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Native Gas Token</span>
              <p className="font-bold text-white flex items-center gap-1">
                <span>BOT</span>
                <span className="text-[10px] font-normal text-slate-400">(150M Supply)</span>
              </p>
            </div>

            <div className="rounded-xl bg-background/60 border border-surfaceBorder/80 p-3.5 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">RPC Endpoint</span>
              <a
                href="https://rpc.botchain.ai"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-slate-300 hover:text-botCyan truncate block"
              >
                rpc.botchain.ai
              </a>
            </div>
          </div>
        </div>

        {/* Protocol Disclaimer Callout */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-slate-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">Parametric Code-Governance Disclaimer</p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              BotInsure operates purely through deterministic smart contracts deployed on BOT Chain Mainnet.
              Policies execute automatically based on verifiable oracle reports (BotOracle and BotLend).
              BotInsure is not a licensed financial institution or statutory insurer. Underwriting liquidity entails capital risks.
            </p>
          </div>
        </div>

        {/* Bottom Navigation & Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-surfaceBorder/60">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-botCyan" />
            <span className="font-bold text-slate-200">BotInsure Protocol</span>
            <span>&copy; {new Date().getFullYear()} BOT Chain Ecosystem. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <a
              href="https://botchain.ai"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-botCyan transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/botchain-logo.png" alt="BOT Chain" className="h-3.5 w-3.5 rounded-full object-cover shrink-0" />
              <span>botchain.ai</span>
            </a>
            <a
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-botCyan transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/botchain-logo.png" alt="BOT Chain" className="h-3.5 w-3.5 rounded-full object-cover shrink-0" />
              <span>scan.botchain.ai</span>
            </a>
            <Link href="/products" className="hover:text-botCyan transition-colors">
              Protection Products
            </Link>
            <Link href="/pools" className="hover:text-botCyan transition-colors">
              Underwriting Pools
            </Link>
            <Link href="/developer" className="hover:text-botCyan transition-colors">
              Developer SDK
            </Link>
            <Link href="/admin" className="hover:text-botCyan transition-colors">
              Governance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
