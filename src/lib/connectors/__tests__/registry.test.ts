import { describe, it, expect } from "vitest";
import { getConnector, getAllConnectors, registerConnector } from "../registry";
import { awinConnector } from "../awin";
import { cjConnector } from "../cj";
import { NetworkConnector } from "../types";

describe("Connector Registry", () => {
  it("retrieves registered connectors by slug case-insensitively", () => {
    expect(getConnector("awin")).toBe(awinConnector);
    expect(getConnector("AWIN")).toBe(awinConnector);
    expect(getConnector("cj")).toBe(cjConnector);
  });

  it("lists all registered connectors", () => {
    const connectors = getAllConnectors();
    expect(connectors).toContain(awinConnector);
    expect(connectors).toContain(cjConnector);
  });

  it("allows registration of a 3rd network without modifying core registry", () => {
    const mockImpactConnector: NetworkConnector = {
      slug: "impact",
      name: "Impact Radius",
      testCredentials: async () => ({ success: true }),
      fetchOffers: async () => [],
      fetchConversions: async () => [],
      mapToCoupon: () => ({} as any),
    };

    registerConnector(mockImpactConnector);

    expect(getConnector("impact")).toBe(mockImpactConnector);
  });
});
