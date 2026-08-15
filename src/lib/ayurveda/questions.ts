import type { Dosha } from "@/generated/prisma/enums";

/**
 * Prakriti/Vikriti questionnaire.
 *
 * Each question offers one option per dosha. Questions carry a weight because
 * classical assessment does not treat all traits equally: stable physical
 * traits (frame, skin, hair) are strong evidence of innate constitution, while
 * mood and appetite fluctuate day to day and are weaker signals for Prakriti —
 * though they are exactly what you want when reading current imbalance.
 */

export type QuestionCategory = "PHYSICAL" | "PHYSIOLOGICAL" | "PSYCHOLOGICAL";

export interface DoshaOption {
  dosha: Dosha;
  label: string;
}

export interface DoshaQuestion {
  id: string;
  category: QuestionCategory;
  prompt: string;
  /** 1 = weak signal, 3 = strong signal. */
  weight: 1 | 2 | 3;
  options: DoshaOption[];
}

export const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  PHYSICAL: "Body & appearance",
  PHYSIOLOGICAL: "Digestion & rhythm",
  PSYCHOLOGICAL: "Mind & temperament",
};

export const DOSHA_QUESTIONS: DoshaQuestion[] = [
  // ── Physical: strongest evidence of innate constitution ──
  {
    id: "body-frame",
    category: "PHYSICAL",
    prompt: "How would you describe your natural body frame?",
    weight: 3,
    options: [
      { dosha: "VATA", label: "Thin and light — I find it hard to gain weight" },
      { dosha: "PITTA", label: "Medium and proportionate — weight stays steady" },
      { dosha: "KAPHA", label: "Solid and broad — I gain weight easily" },
    ],
  },
  {
    id: "skin",
    category: "PHYSICAL",
    prompt: "What is your skin usually like?",
    weight: 3,
    options: [
      { dosha: "VATA", label: "Dry, thin, cool to the touch" },
      { dosha: "PITTA", label: "Warm, reddish, prone to rashes or acne" },
      { dosha: "KAPHA", label: "Thick, smooth, oily, cool" },
    ],
  },
  {
    id: "hair",
    category: "PHYSICAL",
    prompt: "How would you describe your hair?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Dry, frizzy, brittle" },
      { dosha: "PITTA", label: "Fine and straight; early greying or thinning" },
      { dosha: "KAPHA", label: "Thick, heavy, wavy, lustrous" },
    ],
  },
  {
    id: "joints",
    category: "PHYSICAL",
    prompt: "How do your joints behave?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Prominent, they crack and click audibly" },
      { dosha: "PITTA", label: "Loose and flexible, moderate size" },
      { dosha: "KAPHA", label: "Well-cushioned, sturdy, rarely troublesome" },
    ],
  },

  // ── Physiological ──
  {
    id: "appetite",
    category: "PHYSIOLOGICAL",
    prompt: "How is your appetite through the day?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Irregular — sometimes ravenous, sometimes nothing" },
      { dosha: "PITTA", label: "Sharp and punctual; I get irritable if I skip a meal" },
      { dosha: "KAPHA", label: "Steady but mild; I can skip meals comfortably" },
    ],
  },
  {
    id: "digestion",
    category: "PHYSIOLOGICAL",
    prompt: "How does your digestion tend to behave?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Variable, with gas and bloating" },
      { dosha: "PITTA", label: "Strong and fast, sometimes with acidity or heartburn" },
      { dosha: "KAPHA", label: "Slow and heavy, a full feeling long after eating" },
    ],
  },
  {
    id: "thirst",
    category: "PHYSIOLOGICAL",
    prompt: "How much do you typically drink?",
    weight: 1,
    options: [
      { dosha: "VATA", label: "Variable — I often forget to drink" },
      { dosha: "PITTA", label: "A lot; I am frequently thirsty" },
      { dosha: "KAPHA", label: "Little; thirst is rarely strong" },
    ],
  },
  {
    id: "temperature",
    category: "PHYSIOLOGICAL",
    prompt: "Which weather suits you least?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Cold, dry, windy days — my hands and feet go cold" },
      { dosha: "PITTA", label: "Hot sun and humidity — I overheat quickly" },
      { dosha: "KAPHA", label: "Cold and damp — it makes me sluggish and congested" },
    ],
  },
  {
    id: "sleep",
    category: "PHYSIOLOGICAL",
    prompt: "What is your sleep like?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Light and broken; I wake easily" },
      { dosha: "PITTA", label: "Moderate but sound; I wake feeling alert" },
      { dosha: "KAPHA", label: "Deep and long; I find it hard to get up" },
    ],
  },
  {
    id: "energy",
    category: "PHYSIOLOGICAL",
    prompt: "How does your energy behave across a day?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Comes in bursts, then crashes" },
      { dosha: "PITTA", label: "Intense and focused, well sustained" },
      { dosha: "KAPHA", label: "Slow to start but lasts steadily" },
    ],
  },
  {
    id: "perspiration",
    category: "PHYSIOLOGICAL",
    prompt: "How readily do you perspire?",
    weight: 1,
    options: [
      { dosha: "VATA", label: "Scanty, even with exertion" },
      { dosha: "PITTA", label: "Profusely, with a strong odour" },
      { dosha: "KAPHA", label: "Moderately, without much odour" },
    ],
  },

  // ── Psychological ──
  {
    id: "mind",
    category: "PSYCHOLOGICAL",
    prompt: "How does your mind usually work?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Quick, restless, jumping between ideas" },
      { dosha: "PITTA", label: "Sharp, analytical, decisive" },
      { dosha: "KAPHA", label: "Calm, steady, methodical" },
    ],
  },
  {
    id: "memory",
    category: "PSYCHOLOGICAL",
    prompt: "How is your memory?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Learns fast, forgets fast" },
      { dosha: "PITTA", label: "Sharp and accurate on both counts" },
      { dosha: "KAPHA", label: "Slow to learn, but never forgets" },
    ],
  },
  {
    id: "stress",
    category: "PSYCHOLOGICAL",
    prompt: "How do you react under stress?",
    weight: 2,
    options: [
      { dosha: "VATA", label: "Anxious and worried" },
      { dosha: "PITTA", label: "Irritable and frustrated" },
      { dosha: "KAPHA", label: "Withdrawn; I avoid it" },
    ],
  },
  {
    id: "speech",
    category: "PSYCHOLOGICAL",
    prompt: "How do you speak?",
    weight: 1,
    options: [
      { dosha: "VATA", label: "Fast and talkative, often tangential" },
      { dosha: "PITTA", label: "Precise, direct, persuasive" },
      { dosha: "KAPHA", label: "Slow, measured, few words" },
    ],
  },
  {
    id: "spending",
    category: "PSYCHOLOGICAL",
    prompt: "How do you handle money?",
    weight: 1,
    options: [
      { dosha: "VATA", label: "Spend impulsively, save little" },
      { dosha: "PITTA", label: "Spend deliberately on quality" },
      { dosha: "KAPHA", label: "Save steadily, reluctant to spend" },
    ],
  },
];

export const MAX_WEIGHT = DOSHA_QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
