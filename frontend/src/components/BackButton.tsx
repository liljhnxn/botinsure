"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Home, ChevronRight } from "lucide-react";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  // Do not render back button on home page
  if (!pathname || pathname === "/") {
    return null;
  }

  // Generate readable breadcrumb segments
  const pathSegments = pathname.split("/").filter(Boolean);

  const getSegmentLabel = (segment: string, index: number) => {
    // Map known routes to clean labels
    const map: Record<string, string> = {
      products: "Products",
      protect: "Protect",
      pools: "Underwriting Pools",
      pool: "Pool Detail",
      claims: "Claims",
      claim: "Claim Settlement",
      policies: "My Policies",
      policy: "Policy Detail",
      liquidity: "Liquidity Hub",
      admin: "Protocol Admin",
      developer: "Developer SDK",
    };

    if (map[segment]) return map[segment];
    // If it's a numeric ID or address
    if (!isNaN(Number(segment))) return `#${segment}`;
    if (segment.startsWith("0x")) return `${segment.slice(0, 6)}...${segment.slice(-4)}`;
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="w-full mb-6 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
      {/* Back Button with hover arrow micro-animation */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          type="button"
          aria-label="Go back to previous page"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface/90 hover:bg-surfaceHover border border-surfaceBorder hover:border-botCyan/40 text-slate-300 hover:text-botCyan transition-all duration-200 text-xs font-semibold shadow-sm hover:shadow-cyanGlow group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 text-slate-400 group-hover:text-botCyan" />
          <span>Back</span>
        </button>

        {/* Home direct jump */}
        <Link
          href="/"
          className="p-1.5 rounded-xl bg-surface/60 hover:bg-surface border border-surfaceBorder hover:border-botCyan/30 text-slate-400 hover:text-botCyan transition-all duration-200 shadow-sm"
          title="Return to Protocol Dashboard"
        >
          <Home className="h-4 w-4" />
        </Link>
      </div>

      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/" className="hover:text-slate-200 transition-colors">
          Home
        </Link>
        {pathSegments.map((seg, idx) => {
          const isLast = idx === pathSegments.length - 1;
          const href = "/" + pathSegments.slice(0, idx + 1).join("/");
          const label = getSegmentLabel(seg, idx);

          return (
            <React.Fragment key={href}>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              {isLast ? (
                <span className="text-botCyan font-medium">{label}</span>
              ) : (
                <Link href={href} className="hover:text-slate-200 transition-colors">
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}
