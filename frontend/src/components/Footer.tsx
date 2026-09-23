import React from "react";
import Link from "next/link";
import { Shield, ExternalLink, AlertTriangle } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-surfaceBorder bg-background py-10 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Important MVP Disclaimer Alert */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-slate-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">Protocol Risk & Parametric Disclaimer</p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              BotInsure is an experimental on-chain parametric protection protocol (MVP) operating on Botchain Testnet (Chain ID 968).
              It is not a regulated insurance company, and policies are not insured by any government or statutory scheme.
              Protection payouts are strictly code-governed by deterministic oracle parameters (BotOracle / BotLend).
              Liquidity provider returns are variable and depend on net premiums, claims settlement, protocol fees, and pool performance.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-surfaceBorder/60">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-botCyan" />
            <span className="font-semibold text-slate-200">BotInsure Protocol</span>
            <span>&copy; {new Date().getFullYear()} Botchain Ecosystem</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a
              href="https://scan.bohr.life"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-botCyan transition-colors"
            >
              <span>BohrScan Explorer</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://rpc.bohr.life"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-botCyan transition-colors"
            >
              <span>RPC (968)</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <Link href="/developer" className="hover:text-botCyan transition-colors">
              Developer Documentation
            </Link>
            <Link href="/admin" className="hover:text-botCyan transition-colors">
              Protocol Governance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
