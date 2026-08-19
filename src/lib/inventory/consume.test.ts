import { describe, it, expect } from "vitest";
import { allocateConsumption, type BatchStock } from "./consume";

function batch(id: string, quantity: number, expiryDaysFromNow: number): BatchStock {
  return {
    batchId: id,
    quantity,
    expiryDate: new Date(Date.now() + expiryDaysFromNow * 86400000),
  };
}

describe("allocateConsumption", () => {
  it("takes everything from a single sufficient batch", () => {
    const result = allocateConsumption(10, [batch("b1", 50, 30)]);

    expect(result.allocations).toEqual([{ batchId: "b1", quantity: 10 }]);
    expect(result.allocated).toBe(10);
    expect(result.shortfall).toBe(0);
  });

  it("consumes the soonest-expiring batch first, regardless of listed order", () => {
    // b2 expires sooner but is listed second — order in the input must not matter.
    const result = allocateConsumption(5, [
      batch("later", 100, 90),
      batch("sooner", 100, 10),
    ]);

    expect(result.allocations).toEqual([{ batchId: "sooner", quantity: 5 }]);
  });

  it("spills into the next batch once the first is exhausted", () => {
    const result = allocateConsumption(15, [
      batch("first", 10, 5),
      batch("second", 20, 15),
    ]);

    expect(result.allocations).toEqual([
      { batchId: "first", quantity: 10 },
      { batchId: "second", quantity: 5 },
    ]);
    expect(result.allocated).toBe(15);
    expect(result.shortfall).toBe(0);
  });

  it("returns a partial allocation and a shortfall instead of throwing when stock is short", () => {
    const result = allocateConsumption(50, [batch("only", 30, 5)]);

    expect(result.allocations).toEqual([{ batchId: "only", quantity: 30 }]);
    expect(result.allocated).toBe(30);
    expect(result.shortfall).toBe(20);
  });

  it("reports the full amount as shortfall when there is no stock at all", () => {
    const result = allocateConsumption(10, []);

    expect(result.allocations).toEqual([]);
    expect(result.shortfall).toBe(10);
  });

  it("ignores already-depleted batches", () => {
    const result = allocateConsumption(5, [
      batch("empty", 0, 5),
      batch("has-stock", 10, 20),
    ]);

    expect(result.allocations).toEqual([{ batchId: "has-stock", quantity: 5 }]);
  });

  it("is a no-op for a non-positive request", () => {
    expect(allocateConsumption(0, [batch("b1", 10, 5)])).toEqual({
      allocations: [],
      allocated: 0,
      shortfall: 0,
    });
    expect(allocateConsumption(-3, [batch("b1", 10, 5)])).toEqual({
      allocations: [],
      allocated: 0,
      shortfall: 0,
    });
  });
});
