import { describe, it, expect } from "vitest";
import { scoreAssessment, compareToBaseline } from "./dosha";
import { DOSHA_QUESTIONS } from "./questions";
import type { Dosha } from "@/generated/prisma/enums";

/** Answers every question with the same dosha. */
function allAnswers(dosha: Dosha): Record<string, Dosha> {
  return Object.fromEntries(DOSHA_QUESTIONS.map((q) => [q.id, dosha]));
}

describe("scoreAssessment", () => {
  it("returns a pure constitution when every answer points one way", () => {
    const result = scoreAssessment(allAnswers("PITTA"));

    expect(result.dominant).toBe("PITTA");
    expect(result.secondary).toBeNull();
    expect(result.percentages.PITTA).toBe(100);
    expect(result.percentages.VATA).toBe(0);
    expect(result.constitutionName).toBe("Pitta");
    expect(result.isComplete).toBe(true);
  });

  it("always produces percentages summing to exactly 100", () => {
    // Three-way splits are the classic source of 99%/101% rounding bugs.
    const responses: Record<string, Dosha> = {};
    DOSHA_QUESTIONS.forEach((q, i) => {
      responses[q.id] = (["VATA", "PITTA", "KAPHA"] as Dosha[])[i % 3];
    });

    const { percentages } = scoreAssessment(responses);
    const total =
      percentages.VATA + percentages.PITTA + percentages.KAPHA;

    expect(total).toBe(100);
  });

  it("names a dual-dosha constitution when two are close", () => {
    // Split answers evenly between Vata and Pitta.
    const responses: Record<string, Dosha> = {};
    DOSHA_QUESTIONS.forEach((q, i) => {
      responses[q.id] = i % 2 === 0 ? "VATA" : "PITTA";
    });

    const result = scoreAssessment(responses);

    expect(result.secondary).not.toBeNull();
    expect(["Vata-Pitta", "Pitta-Vata"]).toContain(result.constitutionName);
  });

  it("weights questions rather than counting them equally", () => {
    // One weight-3 question for Vata vs one weight-1 question for Kapha.
    const heavy = DOSHA_QUESTIONS.find((q) => q.weight === 3)!;
    const light = DOSHA_QUESTIONS.find((q) => q.weight === 1)!;

    const result = scoreAssessment({
      [heavy.id]: "VATA",
      [light.id]: "KAPHA",
    });

    expect(result.dominant).toBe("VATA");
    expect(result.scores.VATA).toBeGreaterThan(result.scores.KAPHA);
  });

  it("ignores an answer naming a dosha the question does not offer", () => {
    const q = DOSHA_QUESTIONS[0];
    const result = scoreAssessment({
      [q.id]: "PITTA",
      "not-a-real-question": "KAPHA" as Dosha,
    });

    expect(result.answered).toBe(1);
    expect(result.scores.KAPHA).toBe(0);
  });

  it("handles an empty submission without dividing by zero", () => {
    const result = scoreAssessment({});

    expect(result.percentages).toEqual({ VATA: 0, PITTA: 0, KAPHA: 0 });
    expect(result.answered).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  it("does not claim a constitution when nothing was answered", () => {
    // Every score ties at zero here. Naively that reads as "two doshas are
    // within the threshold", which would report a dual-dosha type from no data.
    const result = scoreAssessment({});

    expect(result.constitutionName).toBe("Not assessed");
    expect(result.secondary).toBeNull();
  });

  it("reports an evenly balanced constitution as tridoshic", () => {
    const questions = ["a", "b", "c"].map((id) => ({
      id,
      category: "PHYSICAL" as const,
      prompt: "",
      weight: 1 as const,
      options: [
        { dosha: "VATA" as const, label: "" },
        { dosha: "PITTA" as const, label: "" },
        { dosha: "KAPHA" as const, label: "" },
      ],
    }));

    const result = scoreAssessment(
      { a: "VATA", b: "PITTA", c: "KAPHA" },
      questions,
    );

    expect(result.constitutionName).toBe("Tridoshic");
    expect(result.percentages.VATA).toBe(34);
  });
});

describe("compareToBaseline", () => {
  it("flags a dosha that has drifted above its own baseline", () => {
    const prakriti = { VATA: 50, PITTA: 30, KAPHA: 20 };
    const vikriti = { VATA: 30, PITTA: 55, KAPHA: 15 };

    const { deviations, primaryImbalance, imbalanceScore } =
      compareToBaseline(prakriti, vikriti);

    expect(primaryImbalance?.dosha).toBe("PITTA");
    expect(primaryImbalance?.delta).toBe(25);

    const vata = deviations.find((d) => d.dosha === "VATA")!;
    expect(vata.status).toBe("DEPLETED");

    // 20 + 25 + 5
    expect(imbalanceScore).toBe(50);
  });

  it("treats a high-but-native dosha as balanced", () => {
    // A Pitta-dominant person sitting at their own baseline is not aggravated,
    // even though Pitta is the largest number.
    const prakriti = { VATA: 20, PITTA: 60, KAPHA: 20 };
    const vikriti = { VATA: 22, PITTA: 58, KAPHA: 20 };

    const { primaryImbalance, deviations } = compareToBaseline(
      prakriti,
      vikriti,
    );

    expect(primaryImbalance).toBeNull();
    expect(deviations.every((d) => d.status === "BALANCED")).toBe(true);
  });

  it("scores a patient in perfect balance as zero", () => {
    const p = { VATA: 33, PITTA: 34, KAPHA: 33 };
    expect(compareToBaseline(p, p).imbalanceScore).toBe(0);
  });
});
