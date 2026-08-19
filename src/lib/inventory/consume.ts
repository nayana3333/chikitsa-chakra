/**
 * Stock allocation.
 *
 * Pure function, no database import — same shape as the dosha and scheduling
 * engines. Deciding *which batches* a consumption draws from is a small
 * algorithm in its own right (earliest-expiry-first, never negative, no
 * silent over-draw), so it earns its own tested module rather than being
 * inlined into the Server Action that calls it.
 */

export interface BatchStock {
  batchId: string;
  quantity: number;
  expiryDate: Date;
}

export interface Allocation {
  batchId: string;
  quantity: number;
}

export interface AllocationResult {
  allocations: Allocation[];
  /** Total quantity actually allocated — may be less than requested. */
  allocated: number;
  /** Requested minus allocated. Zero when stock was sufficient. */
  shortfall: number;
}

/**
 * Allocates `requestedQuantity` units of a single item across its batches,
 * consuming from the batch expiring soonest first (FIFO by expiry, the
 * standard pharmacy-stock discipline — using older stock before it expires
 * beats using it in expiry order by chance).
 *
 * Never allocates more than a batch holds, and never throws on insufficient
 * total stock: a therapy session should still be recordable as completed even
 * when the stockroom is short, so the caller gets a partial allocation plus
 * an explicit shortfall to surface as a low-stock signal, not an exception
 * that blocks charting the session at all.
 */
export function allocateConsumption(
  requestedQuantity: number,
  batches: BatchStock[],
): AllocationResult {
  if (requestedQuantity <= 0) {
    return { allocations: [], allocated: 0, shortfall: 0 };
  }

  const ordered = [...batches]
    .filter((b) => b.quantity > 0)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

  const allocations: Allocation[] = [];
  let remaining = requestedQuantity;

  for (const batch of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take <= 0) continue;
    allocations.push({ batchId: batch.batchId, quantity: take });
    remaining -= take;
  }

  const allocated = requestedQuantity - remaining;
  return { allocations, allocated, shortfall: remaining };
}
