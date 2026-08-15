import type { Dosha } from "@/generated/prisma/enums";
import { DOSHA_QUESTIONS, type DoshaQuestion } from "./questions";

/**
 * Dosha scoring.
 *
 * Pure functions with no database or React dependency, so the clinical logic
 * can be unit-tested directly and reasoned about on its own.
 */

export type DoshaResponses = Record<string, Dosha>;

export interface DoshaScores {
  VATA: number;
  PITTA: number;
  KAPHA: number;
}

export interface DoshaResult {
  /** Raw weighted points per dosha. */
  scores: DoshaScores;
  /** Percentages that always sum to exactly 100. */
  percentages: DoshaScores;
  dominant: Dosha;
  /** Present when a second dosha is close enough to be clinically relevant. */
  secondary: Dosha | null;
  /** "Vata-Pitta", "Tridoshic", "Pitta" … */
  constitutionName: string;
  /** How many of the questions were answered. */
  answered: number;
  total: number;
  isComplete: boolean;
}

const DOSHAS: Dosha[] = ["VATA", "PITTA", "KAPHA"];

/**
 * A second dosha counts as part of the constitution when it lands within this
 * many percentage points of the dominant one. Dual-dosha (dvandvaja) types are
 * the common case in practice; single-dosha types are comparatively rare.
 */
const SECONDARY_THRESHOLD = 12;

/** All three within this spread is a balanced tridoshic constitution. */
const TRIDOSHIC_SPREAD = 8;

export function scoreAssessment(
  responses: DoshaResponses,
  questions: DoshaQuestion[] = DOSHA_QUESTIONS,
): DoshaResult {
  const scores: DoshaScores = { VATA: 0, PITTA: 0, KAPHA: 0 };
  let answered = 0;
  let answeredWeight = 0;

  for (const question of questions) {
    const choice = responses[question.id];
    if (!choice) continue;

    // Ignore answers naming a dosha this question doesn't offer — protects the
    // scoring from a tampered client payload.
    if (!question.options.some((o) => o.dosha === choice)) continue;

    scores[choice] += question.weight;
    answeredWeight += question.weight;
    answered += 1;
  }

  const percentages = toPercentages(scores, answeredWeight);
  const ranked = [...DOSHAS].sort((a, b) => percentages[b] - percentages[a]);

  const dominant = ranked[0];
  const runnerUp = ranked[1];
  const spread = percentages[ranked[0]] - percentages[ranked[2]];

  // With nothing answered every score ties at zero, which would otherwise fall
  // through the "two doshas are close" branch and report a confident dual-dosha
  // constitution derived from no evidence at all.
  const hasAnswers = answeredWeight > 0;

  const isTridoshic = hasAnswers && spread <= TRIDOSHIC_SPREAD;
  const secondary =
    hasAnswers &&
    !isTridoshic &&
    percentages[dominant] - percentages[runnerUp] <= SECONDARY_THRESHOLD
      ? runnerUp
      : null;

  return {
    scores,
    percentages,
    dominant,
    secondary,
    constitutionName: !hasAnswers
      ? "Not assessed"
      : isTridoshic
        ? "Tridoshic"
        : secondary
          ? `${title(dominant)}-${title(secondary)}`
          : title(dominant),
    answered,
    total: questions.length,
    isComplete: answered === questions.length,
  };
}

/**
 * Converts weighted points to percentages that sum to exactly 100.
 *
 * Rounding each share independently can total 99 or 101, which looks broken
 * next to a pie chart. The largest-remainder method distributes the leftover
 * points to whichever doshas were rounded down hardest.
 */
function toPercentages(scores: DoshaScores, totalWeight: number): DoshaScores {
  if (totalWeight === 0) return { VATA: 0, PITTA: 0, KAPHA: 0 };

  const exact = DOSHAS.map((d) => ({
    dosha: d,
    value: (scores[d] / totalWeight) * 100,
  }));

  const floored = exact.map((e) => ({ ...e, floor: Math.floor(e.value) }));
  let remaining = 100 - floored.reduce((sum, e) => sum + e.floor, 0);

  const byRemainder = [...floored].sort(
    (a, b) => (b.value - b.floor) - (a.value - a.floor),
  );

  const result: DoshaScores = { VATA: 0, PITTA: 0, KAPHA: 0 };
  for (const entry of floored) result[entry.dosha] = entry.floor;
  for (const entry of byRemainder) {
    if (remaining <= 0) break;
    result[entry.dosha] += 1;
    remaining -= 1;
  }

  return result;
}

/**
 * Compares current state (Vikriti) against innate constitution (Prakriti).
 *
 * Treatment aims to return Vikriti toward Prakriti — so the meaningful number
 * is not "how much Pitta does this patient have" but "how far has Pitta drifted
 * from this patient's own baseline". A Pitta-dominant person at 45% Pitta is
 * balanced; a Kapha-dominant person at 45% Pitta is significantly aggravated.
 */
export interface DoshaDeviation {
  dosha: Dosha;
  prakriti: number;
  vikriti: number;
  /** Positive = aggravated above baseline, negative = depleted below it. */
  delta: number;
  status: "AGGRAVATED" | "BALANCED" | "DEPLETED";
}

/** Drift beyond this many points is considered clinically meaningful. */
const IMBALANCE_THRESHOLD = 10;

export function compareToBaseline(
  prakriti: DoshaScores,
  vikriti: DoshaScores,
): {
  deviations: DoshaDeviation[];
  /** Total absolute drift — a single "how far off balance" number, 0 = perfect. */
  imbalanceScore: number;
  primaryImbalance: DoshaDeviation | null;
} {
  const deviations: DoshaDeviation[] = DOSHAS.map((dosha) => {
    const delta = vikriti[dosha] - prakriti[dosha];
    return {
      dosha,
      prakriti: prakriti[dosha],
      vikriti: vikriti[dosha],
      delta,
      status:
        delta > IMBALANCE_THRESHOLD
          ? "AGGRAVATED"
          : delta < -IMBALANCE_THRESHOLD
            ? "DEPLETED"
            : "BALANCED",
    };
  });

  const imbalanceScore = deviations.reduce(
    (sum, d) => sum + Math.abs(d.delta),
    0,
  );

  const aggravated = deviations
    .filter((d) => d.status === "AGGRAVATED")
    .sort((a, b) => b.delta - a.delta);

  return {
    deviations,
    imbalanceScore,
    primaryImbalance: aggravated[0] ?? null,
  };
}

export const DOSHA_META: Record<
  Dosha,
  { name: string; elements: string; qualities: string; colorVar: string }
> = {
  VATA: {
    name: "Vata",
    elements: "Air + Ether",
    qualities: "Dry, light, cold, mobile, subtle",
    colorVar: "var(--vata)",
  },
  PITTA: {
    name: "Pitta",
    elements: "Fire + Water",
    qualities: "Hot, sharp, light, oily, spreading",
    colorVar: "var(--pitta)",
  },
  KAPHA: {
    name: "Kapha",
    elements: "Earth + Water",
    qualities: "Heavy, slow, cool, oily, stable",
    colorVar: "var(--kapha)",
  },
};

function title(d: Dosha): string {
  return DOSHA_META[d].name;
}

/**
 * Which therapies classically address an aggravated dosha. Used to pre-filter
 * the protocol library when a doctor opens the prescribing screen — a
 * suggestion, never an automatic decision.
 */
export const THERAPY_FOR_DOSHA: Record<Dosha, string[]> = {
  VATA: ["BASTI", "ABHYANGA", "SHIRODHARA", "SWEDANA"],
  PITTA: ["VIRECHANA", "RAKTAMOKSHANA", "SHIRODHARA"],
  KAPHA: ["VAMANA", "NASYA", "UDVARTANA", "SWEDANA"],
};
