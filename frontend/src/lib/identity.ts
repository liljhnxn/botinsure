/**
 * @notice Resolves on-chain identity for a given address.
 * Compatible with future BotNS (.bot) lookup registry.
 * Currently returns the resolved address string directly without fictitious names.
 */
export function resolveIdentity(address: string | undefined): string {
  if (!address) return "";
  return address;
}

export function formatAddress(address: string | undefined): string {
  if (!address) return "";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
