"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePatient } from "@/lib/auth/dal";
import { scoreAssessment, type DoshaResponses } from "@/lib/ayurveda/dosha";
import { DOSHA_QUESTIONS } from "@/lib/ayurveda/questions";
import type { AssessmentType } from "@/generated/prisma/enums";

const submissionSchema = z.object({
  type: z.enum(["PRAKRITI", "VIKRITI"]),
  responses: z.record(z.string(), z.enum(["VATA", "PITTA", "KAPHA"])),
});

export type AssessmentState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; constitution: string };

/**
 * Scores and stores a completed questionnaire.
 *
 * Scoring happens here, never on the client: a Server Action is a public HTTP
 * endpoint, so anything the browser sends is untrusted. The client submits
 * only which option was chosen per question — the weights and the resulting
 * constitution are derived server-side.
 */
export async function submitAssessment(
  _prev: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const { profile } = await requirePatient();

  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { status: "error", message: "Malformed submission." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { status: "error", message: "Malformed submission." };
  }

  const parsed = submissionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { status: "error", message: "Some answers were not valid." };
  }

  const { type, responses } = parsed.data;

  const answeredCount = Object.keys(responses).length;
  if (answeredCount < DOSHA_QUESTIONS.length) {
    return {
      status: "error",
      message: `Please answer all ${DOSHA_QUESTIONS.length} questions — ${DOSHA_QUESTIONS.length - answeredCount} remaining.`,
    };
  }

  const result = scoreAssessment(responses as DoshaResponses);

  await db.doshaAssessment.create({
    data: {
      patientId: profile.id,
      type: type as AssessmentType,
      vataScore: result.percentages.VATA,
      pittaScore: result.percentages.PITTA,
      kaphaScore: result.percentages.KAPHA,
      dominant: result.dominant,
      secondary: result.secondary,
      responses,
    },
  });

  await db.auditLog.create({
    data: {
      action: "assessment.create",
      entity: "DoshaAssessment",
      entityId: profile.id,
      metadata: { type, constitution: result.constitutionName },
    },
  });

  revalidatePath("/patient");
  revalidatePath("/patient/constitution");

  return { status: "success", constitution: result.constitutionName };
}
