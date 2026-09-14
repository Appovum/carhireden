import { describe, it, expect } from "vitest";
import {
  createMoney,
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
  addMoney,
  subtractMoney,
  calculateShare,
} from "../money";

describe("Money Utility (Minor Units)", () => {
  it("creates valid money with integer minor units", () => {
    const m = createMoney(1050, "USD");
    expect(m.amountMinor).toBe(1050);
    expect(m.currency).toBe("USD");
  });

  it("throws error when creating money with float minor units", () => {
    expect(() => createMoney(10.5, "USD")).toThrow(TypeError);
  });

  it("converts major float to minor units accurately without precision loss", () => {
    const m1 = toMinorUnits(19.99, "USD");
    expect(m1.amountMinor).toBe(1999);

    const m2 = toMinorUnits("49.95", "EUR");
    expect(m2.amountMinor).toBe(4995);
    expect(m2.currency).toBe("EUR");
  });

  it("converts minor units back to major float for presentation", () => {
    const m = createMoney(2500, "USD");
    expect(fromMinorUnits(m)).toBe(25.0);
  });

  it("formats money correctly for locale", () => {
    const m = createMoney(1550, "USD");
    const formatted = formatMoney(m, "en-US");
    expect(formatted).toContain("15.50");
  });

  it("adds and subtracts money with same currency", () => {
    const a = createMoney(1000, "USD");
    const b = createMoney(500, "USD");
    expect(addMoney(a, b).amountMinor).toBe(1500);
    expect(subtractMoney(a, b).amountMinor).toBe(500);
  });

  it("throws error when performing operations on mismatched currencies", () => {
    const usd = createMoney(1000, "USD");
    const eur = createMoney(1000, "EUR");
    expect(() => addMoney(usd, eur)).toThrow();
  });

  it("calculates percentage cashback share correctly as integer minor units", () => {
    const commission = createMoney(1000, "USD"); // $10 commission
    const userShare = calculateShare(commission, 80); // 80% share to user = $8.00 = 800
    expect(userShare.amountMinor).toBe(800);
  });
});
