/**
 * Scripted answers used when ANTHROPIC_API_KEY is absent.
 *
 * These are not a pretence that the AI is running — the UI says plainly that
 * it is in demo mode. They exist so the feature can be demonstrated end to end
 * (streaming, message history, persistence) without a key, and so a reviewer
 * opening the project cold sees a working conversation rather than an error.
 */

interface DemoAnswer {
  match: RegExp;
  text: string;
}

const ANSWERS: DemoAnswer[] = [
  {
    match: /\b(vata|vaata)\b/i,
    text: `Vata is the dosha formed from air and ether. It governs everything that moves in the body — breath, circulation, nerve impulses, and the passage of food through the gut.

When Vata is balanced you tend to feel light, alert and creative. When it rises too high the qualities it carries — dry, cold, irregular — start to show up as symptoms: disturbed sleep, anxious or racing thoughts, constipation, cracking joints, and cold hands and feet.

Panchakarma addresses aggravated Vata mainly through **Basti** (medicated enema), which is considered the single most effective treatment for it, usually supported by **Abhyanga** (warm oil massage) and **Swedana** (sudation).

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`,
  },
  {
    match: /\b(pitta)\b/i,
    text: `Pitta is formed from fire and water, and governs transformation — digestion, metabolism, body temperature, and the sharpness of your perception and judgement.

Balanced Pitta shows up as strong digestion, clear thinking and decisiveness. Aggravated Pitta brings heat: acidity and reflux, skin eruptions, inflammation, feeling overheated, and a shorter temper than usual.

The classical Panchakarma answer for excess Pitta is **Virechana** (therapeutic purgation), which clears accumulated heat through the digestive tract. **Shirodhara** is often added when the mind is affected as well.

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`,
  },
  {
    match: /\b(kapha)\b/i,
    text: `Kapha is formed from earth and water. It provides structure, lubrication and stability — the cushioning in your joints, the moisture in your tissues, and your physical and emotional steadiness.

Balanced Kapha gives strength, endurance and calm. In excess it becomes heavy and stagnant: weight gain, congestion, sluggish digestion, daytime drowsiness and a reluctance to start things.

**Vamana** (therapeutic emesis) is the classical treatment for aggravated Kapha, often with **Nasya** for congestion above the collarbone and **Udvartana** (herbal powder massage) to break up heaviness.

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`,
  },
  {
    match: /\b(panchakarma|five action|phases?)\b/i,
    text: `Panchakarma means "five actions" — Vamana, Virechana, Basti, Nasya and Raktamokshana. But the five main procedures are only the middle of a three-stage process, and the stages matter as much as the procedure itself:

**Purvakarma — preparation.** Internal and external oleation (Snehana) and sudation (Swedana) loosen accumulated toxins from the tissues and move them toward the digestive tract. Skipping or rushing this is the most common reason a Panchakarma course goes badly.

**Pradhanakarma — the main procedure.** The actual eliminative therapy, chosen for the dosha involved.

**Paschatkarma — aftercare.** A graded return to normal diet (Samsarjana krama), rest, and rebuilding. Digestive fire is deliberately weak after elimination, and this stage restores it.

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`,
  },
  {
    match: /\b(prakriti|vikriti|constitution)\b/i,
    text: `These are two different readings, and the difference between them is what treatment actually works on.

**Prakriti** is your constitution — the balance of doshas you were born with. It does not change over your lifetime. It explains your natural build, temperament, digestion and tendencies.

**Vikriti** is your current state. It shifts with season, diet, stress, sleep and illness.

A Pitta-dominant person sitting at 55% Pitta is simply being themselves. A Kapha-dominant person at 55% Pitta has drifted a long way from their own baseline, and that gap is what the doctor treats. This is why the app scores and stores the two separately, and charts them against each other on your dashboard.

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`,
  },
  {
    match: /\b(diet|food|eat|pathya|apathya)\b/i,
    text: `Dietary guidance in Ayurveda is framed as **Pathya** (what suits you) and **Apathya** (what to avoid), and it is specific to the dosha being treated rather than universal.

A few principles that hold across most Panchakarma courses:

- Eat at consistent times — irregular meals aggravate Vata more than almost anything else.
- Favour freshly cooked, warm, lightly spiced food over raw, cold or reheated food.
- Leave about three hours between your last meal and sleeping.
- During Paschatkarma (aftercare) your digestion is deliberately weak — follow the graded diet your doctor sets rather than returning straight to normal food.

Your own plan is on the **Diet & Lifestyle** page, and it is set by your doctor for the dosha your current treatment targets.

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`,
  },
  {
    match: /\b(prepare|before|empty stomach|session)\b/i,
    text: `For most Purvakarma and Pradhanakarma procedures:

- **Come on an empty stomach** unless your therapist has told you otherwise — usually nothing for about three hours beforehand.
- **Wear loose cotton clothing.** Medicated oils stain, so bring something you don't mind marking.
- **Avoid cold water** for at least two hours after an oil-based procedure — it undoes the effect of the warmth.
- **Rest afterwards.** Mild tiredness after Abhyanga or Swedana is expected and usually passes within a few hours.
- **Tell your therapist** about any discomfort during the session rather than after it. They can adjust temperature, pressure and duration.

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`,
  },
];

const FALLBACK = `I can explain Ayurvedic concepts, walk you through what a Panchakarma procedure involves, and help you prepare for your sessions.

Try asking me about:
- What Vata, Pitta or Kapha mean
- The difference between Prakriti and Vikriti
- What the three phases of Panchakarma are
- How to prepare for tomorrow's session

For anything about your own diagnosis, medicines, or changes to your therapy plan, please speak to your doctor — that is not something I can advise on.

*Demo mode — this is a scripted answer. Add an ANTHROPIC_API_KEY to enable the live assistant.*`;

export function demoAnswerFor(question: string): string {
  return ANSWERS.find((a) => a.match.test(question))?.text ?? FALLBACK;
}
