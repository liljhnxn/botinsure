import { formatEther } from "viem";

export function formatBOT(amount: bigint | undefined, decimals = 2): string {
  if (amount === undefined || amount === null) return "0";
  try {
    const floatVal = parseFloat(formatEther(amount));
    if (isNaN(floatVal)) return "0";
    return floatVal.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  } catch {
    return "0";
  }
}

export function formatUSDPrice(rawPrice: bigint | number | undefined, decimals = 8): string {
  if (!rawPrice) return "$0.00";
  const num = typeof rawPrice === "bigint" ? Number(rawPrice) / 10 ** decimals : rawPrice / 10 ** decimals;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

export function formatDuration(seconds: bigint | number | undefined): string {
  if (!seconds) return "0d";
  const sec = typeof seconds === "bigint" ? Number(seconds) : seconds;
  const days = Math.round(sec / 86400);
  if (days < 1) {
    const hours = Math.round(sec / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export function formatDate(timestamp: bigint | number | undefined): string {
  if (!timestamp || timestamp === 0n || timestamp === 0) return "N/A";
  const sec = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(sec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export enum PolicyStatusEnum {
  ACTIVE = 0,
  TRIGGERED = 1,
  CLAIMABLE = 2,
  CLAIMED = 3,
  EXPIRED = 4,
  CANCELLED = 5,
}

export function getStatusBadge(statusNum: number | undefined) {
  switch (statusNum) {
    case 0:
      return { label: "ACTIVE", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case 1:
      return { label: "TRIGGERED", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case 2:
      return { label: "CLAIMABLE", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" };
    case 3:
      return { label: "CLAIMED", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    case 4:
      return { label: "EXPIRED", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
    case 5:
      return { label: "CANCELLED", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    default:
      return { label: "UNKNOWN", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
  }
}
