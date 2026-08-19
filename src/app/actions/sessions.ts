"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTherapist } from "@/lib/auth/dal";
import { allocateConsumption, type BatchStock } from "@/lib/inventory/consume";
import { Prisma } from "@/generated/prisma/client";

/**
 * Session completion — the action that closes the loop between "a protocol
 * says this procedure uses these materials" and "the stockroom actually has
 * less of them now."
 *
 * Everything here runs inside one Prisma transaction: charting a session and
 * drawing down the stock it consumed are one clinical event, not two
 * independent writes that could partially fail and leave the record and the
 * stockroom disagreeing with each other.
 */

const materialsSchema = z.array(
  z.object({
    itemName: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
  }),
);

const vitalsSchema = z.object({
  bp: z.string().trim().max(20).optional(),
  pulse: z.coerce.number().int().positive().max(300).optional(),
  weight: z.coerce.number().positive().max(400).optional(),
});

export type SessionActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

export async function completeTherapySession(
  sessionId: string,
  formData: FormData,
): Promise<SessionActionState> {
  const { user, profile } = await requireTherapist();

  const parsedVitals = vitalsSchema.safeParse({
    bp: formData.get("bp") || undefined,
    pulse: formData.get("pulse") || undefined,
    weight: formData.get("weight") || undefined,
  });
  if (!parsedVitals.success) {
    return { status: "error", message: "Check the vitals fields and try again." };
  }
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000) || null;

  const session = await db.therapySession.findUnique({
    where: { id: sessionId },
    include: {
      plan: { select: { templateId: true } },
    },
  });

  if (!session) return { status: "error", message: "Session not found." };
  if (session.therapistId !== profile.id) {
    return { status: "error", message: "This session isn't assigned to you." };
  }
  if (session.status === "COMPLETED") {
    return { status: "error", message: "This session is already completed." };
  }
  if (session.status === "CANCELLED") {
    return { status: "error", message: "A cancelled session can't be completed." };
  }

  // A protocol step's materials are advisory data on the template, not a
  // constraint the session must satisfy — a custom or template-less plan
  // simply has nothing to consume, and that's a normal case, not an error.
  const step = session.plan.templateId
    ? await db.protocolStep.findFirst({
        where: {
          templateId: session.plan.templateId,
          dayOffset: session.dayNumber - 1,
          procedureName: session.procedureName,
        },
        select: { materials: true },
      })
    : null;

  const parsedMaterials = materialsSchema.safeParse(step?.materials ?? []);
  const materials = parsedMaterials.success ? parsedMaterials.data : [];

  const now = new Date();
  const shortfalls: string[] = [];

  try {
    await db.$transaction(async (tx) => {
      for (const material of materials) {
        const item = await tx.inventoryItem.findUnique({
          where: { name: material.itemName },
          select: { id: true },
        });
        // A template referencing a material that was never stocked is a data
        // problem to flag elsewhere, not a reason to block charting the
        // session that's actually in front of the therapist right now.
        if (!item) continue;

        const batches = await tx.inventoryBatch.findMany({
          where: { itemId: item.id, quantity: { gt: 0 } },
          select: { id: true, quantity: true, expiryDate: true },
        });

        const stock: BatchStock[] = batches.map((b) => ({
          batchId: b.id,
          quantity: Number(b.quantity),
          expiryDate: b.expiryDate,
        }));

        const { allocations, allocated, shortfall } = allocateConsumption(
          material.quantity,
          stock,
        );

        for (const alloc of allocations) {
          await tx.inventoryBatch.update({
            where: { id: alloc.batchId },
            data: { quantity: { decrement: alloc.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              itemId: item.id,
              batchId: alloc.batchId,
              type: "OUT",
              quantity: new Prisma.Decimal(alloc.quantity),
              reason: `Consumed in session: ${session.procedureName}`,
              actorId: user.id,
            },
          });
        }

        if (allocated > 0) {
          await tx.sessionMaterial.upsert({
            where: { sessionId_itemId: { sessionId: session.id, itemId: item.id } },
            create: { sessionId: session.id, itemId: item.id, quantity: new Prisma.Decimal(allocated) },
            update: { quantity: new Prisma.Decimal(allocated) },
          });
        }

        if (shortfall > 0) {
          shortfalls.push(`${material.itemName} (short by ${shortfall} ${material.unit ?? ""})`.trim());
        }
      }

      await tx.therapySession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          actualStart: session.actualStart ?? session.scheduledStart,
          actualEnd: now,
          postVitals: parsedVitals.data,
          therapistNotes: notes,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "session.complete",
          entity: "TherapySession",
          entityId: session.id,
          metadata: shortfalls.length ? { stockShortfalls: shortfalls } : undefined,
        },
      });
    });
  } catch (error) {
    console.error("completeTherapySession failed:", error);
    return { status: "error", message: "Couldn't save the session. Please try again." };
  }

  revalidatePath("/therapist");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  revalidatePath("/patient");

  return { status: "success" };
}

export async function markSessionMissed(sessionId: string): Promise<SessionActionState> {
  const { user, profile } = await requireTherapist();

  const session = await db.therapySession.findUnique({
    where: { id: sessionId },
    select: { id: true, therapistId: true, status: true },
  });

  if (!session) return { status: "error", message: "Session not found." };
  if (session.therapistId !== profile.id) {
    return { status: "error", message: "This session isn't assigned to you." };
  }
  if (session.status === "COMPLETED" || session.status === "CANCELLED") {
    return { status: "error", message: "This session can no longer be changed." };
  }

  await db.$transaction([
    db.therapySession.update({
      where: { id: session.id },
      data: { status: "MISSED" },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        action: "session.mark_missed",
        entity: "TherapySession",
        entityId: session.id,
      },
    }),
  ]);

  revalidatePath("/therapist");
  return { status: "success" };
}
