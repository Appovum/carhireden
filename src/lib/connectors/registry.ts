// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Connector Registry
// Plugin registry allowing zero-modification addition of 3rd party networks.
// ═══════════════════════════════════════════════════════════════════

import { NetworkConnector } from "./types";

const connectorsRegistry = new Map<string, NetworkConnector>();

export function registerConnector(connector: NetworkConnector): void {
  connectorsRegistry.set(connector.slug.toLowerCase(), connector);
}

export function getConnector(slug: string): NetworkConnector | undefined {
  return connectorsRegistry.get(slug.toLowerCase());
}

export function getAllConnectors(): NetworkConnector[] {
  return Array.from(connectorsRegistry.values());
}
