import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@nextblock-cms/db/server", () => ({
  getServiceRoleSupabaseClient: () => ({}),
}));
vi.mock("@nextblock-cms/ecommerce/server", () => ({
  syncProductSaleCouponToFreemius: vi.fn(),
}));

import { normalizeDateInput, parsePriceCell } from "./server";

describe("normalizeDateInput", () => {
  it("treats an empty value as a valid no-op", () => {
    expect(normalizeDateInput("", "start")).toEqual({ value: null, valid: true });
    expect(normalizeDateInput(undefined, "end")).toEqual({ value: null, valid: true });
  });

  it("makes a date-only start the start of the day and a date-only end the end of the day", () => {
    const start = normalizeDateInput("2026-06-10", "start");
    expect(start.valid).toBe(true);
    const startDate = new Date(start.value as string);
    expect([startDate.getHours(), startDate.getMinutes(), startDate.getSeconds()]).toEqual([0, 0, 0]);

    const end = normalizeDateInput("2026-06-10", "end");
    expect(end.valid).toBe(true);
    const endDate = new Date(end.value as string);
    expect([endDate.getHours(), endDate.getMinutes(), endDate.getSeconds()]).toEqual([23, 59, 59]);
  });

  it("forces end seconds to 59 and start seconds to 0 for timed values", () => {
    const end = new Date(normalizeDateInput("2026-06-10T14:30", "end").value as string);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMinutes()).toBe(30);

    const start = new Date(normalizeDateInput("2026-06-10T14:30", "start").value as string);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMinutes()).toBe(30);
  });

  it("rejects unparseable values", () => {
    expect(normalizeDateInput("not-a-date", "start")).toEqual({ value: null, valid: false });
  });
});

describe("parsePriceCell", () => {
  it("returns nulls for an empty cell", () => {
    expect(parsePriceCell("")).toEqual({ scalar: null, map: null, error: null });
  });

  it("parses a single number", () => {
    expect(parsePriceCell("14.99")).toEqual({ scalar: 14.99, map: null, error: null });
  });

  it("parses a multi-currency JSON map and upper-cases codes", () => {
    const result = parsePriceCell('{"usd":14.99,"EUR":13.5}');
    expect(result.error).toBeNull();
    expect(result.scalar).toBeNull();
    expect(result.map).toEqual({ USD: 14.99, EUR: 13.5 });
  });

  it("keeps null entries in a JSON map (clearing a currency)", () => {
    const result = parsePriceCell('{"USD":null}');
    expect(result.error).toBeNull();
    expect(result.map).toEqual({ USD: null });
  });

  it("rejects negative or non-numeric input", () => {
    expect(parsePriceCell("-5").error).toBeTruthy();
    expect(parsePriceCell("abc").error).toBeTruthy();
    expect(parsePriceCell('{"USD":-1}').error).toBeTruthy();
    expect(parsePriceCell("[1,2]").error).toBeTruthy();
  });
});
