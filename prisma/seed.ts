import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  Dosha,
  TherapyType,
  SessionStatus,
} from "../src/generated/prisma/enums";
import {
  expandProtocol,
  schedulePlan,
  type TherapistInput,
  type RoomInput,
  type ExistingBooking,
} from "../src/lib/scheduling/engine";

/**
 * Seeds a clinic that looks like it has been running for months: patients
 * partway through treatment, historical sessions with outcome data behind the
 * progress charts, stock that is about to expire, and unpaid invoices.
 *
 * Idempotent — it clears the tables it owns first, so it can be re-run freely.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Chikitsa@2026";

// ── Deterministic RNG ────────────────────────────────────────
// A fixed seed means screenshots, charts and demo walkthroughs stay identical
// between runs, which matters when you are presenting this.
let rngState = 20260812;
function rand(): number {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

// ── Reference data ───────────────────────────────────────────

const FIRST_NAMES = [
  "Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Ishita", "Kabir", "Meera",
  "Rohan", "Saanvi", "Aditya", "Kavya", "Nikhil", "Priya", "Rahul", "Sneha",
  "Vikram", "Tara", "Karthik", "Lakshmi", "Devang", "Nisha", "Suresh", "Anjali",
  "Manoj",
];
const LAST_NAMES = [
  "Sharma", "Nair", "Patel", "Reddy", "Iyer", "Menon", "Desai", "Kulkarni",
  "Bhat", "Rao", "Joshi", "Pillai", "Verma", "Gupta", "Chandran",
];

const COMPLAINTS = [
  { complaint: "Chronic lower back pain, worse in the mornings", dx: "Katigraha (lumbar spondylosis)", therapy: "BASTI" as TherapyType },
  { complaint: "Persistent acidity and burning sensation after meals", dx: "Amlapitta (hyperacidity)", therapy: "VIRECHANA" as TherapyType },
  { complaint: "Difficulty sleeping, racing thoughts at night", dx: "Anidra (insomnia) with Vata aggravation", therapy: "SHIRODHARA" as TherapyType },
  { complaint: "Recurring sinus congestion and headaches", dx: "Dushta Pratishyaya (chronic sinusitis)", therapy: "NASYA" as TherapyType },
  { complaint: "Joint stiffness and swelling in both knees", dx: "Amavata (rheumatoid arthritis)", therapy: "ABHYANGA" as TherapyType },
  { complaint: "Recurrent skin eruptions and itching", dx: "Kushtha (chronic dermatitis)", therapy: "VIRECHANA" as TherapyType },
  { complaint: "Breathlessness on exertion, seasonal wheezing", dx: "Tamaka Shwasa (bronchial asthma)", therapy: "VAMANA" as TherapyType },
  { complaint: "Generalised fatigue and poor digestion", dx: "Agnimandya with Ama accumulation", therapy: "UDVARTANA" as TherapyType },
];

const CONDITIONS = [
  "Type 2 diabetes", "Hypertension", "Hypothyroidism", "Migraine",
  "Seasonal allergy", "", "", "",
];

async function main() {
  console.log("→ Clearing existing data…");
  // Children before parents. Run sequentially rather than inside one
  // $transaction — batching thirty statements into a single interactive
  // transaction is enough to have the Prisma Postgres proxy drop the
  // connection, and atomicity buys nothing for a local reseed.
  const tables = [
    db.chatMessage, db.chatThread, db.auditLog, db.notification,
    db.payment, db.invoiceLine, db.invoice,
    db.sessionMaterial, db.stockMovement, db.inventoryBatch, db.inventoryItem,
    db.dietItem, db.dietPlan, db.progressEntry, db.sessionFeedback,
    db.therapySession, db.therapyPlan, db.protocolStep, db.protocolTemplate,
    db.prescription, db.consultation, db.doshaAssessment, db.room,
    db.timeOff, db.availabilityRule,
    db.patientProfile, db.doctorProfile, db.therapistProfile, db.user,
  ];
  for (const table of tables) {
    await (table as { deleteMany: () => Promise<unknown> }).deleteMany();
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ── Rooms ──────────────────────────────────────────────────
  console.log("→ Creating rooms…");
  const rooms = await Promise.all(
    [
      { name: "Consultation 1", type: "CONSULTATION" as const },
      { name: "Consultation 2", type: "CONSULTATION" as const },
      { name: "Therapy Hall A", type: "THERAPY_TABLE" as const },
      { name: "Therapy Hall B", type: "THERAPY_TABLE" as const },
      { name: "Therapy Hall C", type: "THERAPY_TABLE" as const },
      { name: "Swedana Chamber", type: "STEAM_CHAMBER" as const },
      { name: "Basti Suite", type: "BASTI_ROOM" as const },
    ].map((r) => db.room.create({ data: r })),
  );

  // ── Staff ──────────────────────────────────────────────────
  console.log("→ Creating staff…");

  await db.user.create({
    data: {
      email: "admin@chikitsa.dev",
      passwordHash,
      role: "ADMIN",
      firstName: "Nayana",
      lastName: "Menon",
      phone: "9845012345",
    },
  });

  const doctorSpecs = [
    {
      email: "doctor@chikitsa.dev",
      firstName: "Ananya",
      lastName: "Krishnan",
      registrationNo: "KA/BAMS/2011/4471",
      qualification: "BAMS, MD (Panchakarma)",
      specializations: ["Panchakarma", "Rheumatology", "Digestive disorders"],
      yearsExperience: 14,
      fee: 800,
    },
    {
      email: "dr.rao@chikitsa.dev",
      firstName: "Suresh",
      lastName: "Rao",
      registrationNo: "KA/BAMS/2005/1188",
      qualification: "BAMS, MD (Kayachikitsa)",
      specializations: ["Respiratory", "Skin disorders"],
      yearsExperience: 21,
      fee: 1000,
    },
  ];

  const doctors = [];
  for (const spec of doctorSpecs) {
    const user = await db.user.create({
      data: {
        email: spec.email,
        passwordHash,
        role: "DOCTOR",
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: `98${randInt(10000000, 99999999)}`,
        doctor: {
          create: {
            registrationNo: spec.registrationNo,
            qualification: spec.qualification,
            specializations: spec.specializations,
            yearsExperience: spec.yearsExperience,
            consultationFee: spec.fee,
            bio: `${spec.qualification} with ${spec.yearsExperience} years of clinical practice.`,
          },
        },
      },
      include: { doctor: true },
    });
    doctors.push(user.doctor!);
  }

  const therapistSpecs = [
    {
      email: "therapist@chikitsa.dev",
      firstName: "Lakshmi",
      lastName: "Pillai",
      employeeCode: "TH-001",
      expertise: ["ABHYANGA", "SHIRODHARA", "SWEDANA", "UDVARTANA"] as TherapyType[],
      years: 9,
    },
    {
      email: "th.ravi@chikitsa.dev",
      firstName: "Ravi",
      lastName: "Kumar",
      employeeCode: "TH-002",
      expertise: ["BASTI", "VIRECHANA", "ABHYANGA", "SWEDANA"] as TherapyType[],
      years: 12,
    },
    {
      email: "th.geetha@chikitsa.dev",
      firstName: "Geetha",
      lastName: "Nair",
      employeeCode: "TH-003",
      expertise: ["NASYA", "VAMANA", "SHIRODHARA", "ABHYANGA", "UDVARTANA"] as TherapyType[],
      years: 6,
    },
    {
      email: "th.mohan@chikitsa.dev",
      firstName: "Mohan",
      lastName: "Das",
      employeeCode: "TH-004",
      expertise: ["RAKTAMOKSHANA", "KATI_BASTI", "ABHYANGA", "SWEDANA", "BASTI"] as TherapyType[],
      years: 15,
    },
  ];

  const therapists = [];
  for (const spec of therapistSpecs) {
    const user = await db.user.create({
      data: {
        email: spec.email,
        passwordHash,
        role: "THERAPIST",
        firstName: spec.firstName,
        lastName: spec.lastName,
        phone: `97${randInt(10000000, 99999999)}`,
        therapist: {
          create: {
            employeeCode: spec.employeeCode,
            qualification: "Diploma in Panchakarma Technique",
            expertise: spec.expertise,
            yearsExperience: spec.years,
            // Monday–Saturday, 08:00–18:00.
            availability: {
              create: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
                dayOfWeek,
                startMinute: 8 * 60,
                endMinute: 18 * 60,
              })),
            },
          },
        },
      },
      include: { therapist: { include: { availability: true } } },
    });
    therapists.push(user.therapist!);
  }

  // ── Protocol templates ─────────────────────────────────────
  console.log("→ Creating protocol templates…");

  const templateSpecs: {
    name: string;
    therapyType: TherapyType;
    description: string;
    totalDays: number;
    steps: {
      phase: "PURVAKARMA" | "PRADHANAKARMA" | "PASCHATKARMA";
      dayOffset: number;
      procedureName: string;
      durationMin: number;
      isRestDay?: boolean;
      materials?: { itemName: string; quantity: number; unit: string }[];
    }[];
  }[] = [
    {
      name: "Standard Virechana — 14 day",
      therapyType: "VIRECHANA",
      description:
        "Classical purgation protocol for Pitta disorders: internal oleation, sudation, the purgative day, then graded diet.",
      totalDays: 14,
      steps: [
        { phase: "PURVAKARMA", dayOffset: 0, procedureName: "Snehapana (ghee, day 1)", durationMin: 45, materials: [{ itemName: "Mahatiktaka Ghrita", quantity: 30, unit: "ml" }] },
        { phase: "PURVAKARMA", dayOffset: 1, procedureName: "Snehapana (ghee, day 2)", durationMin: 45, materials: [{ itemName: "Mahatiktaka Ghrita", quantity: 60, unit: "ml" }] },
        { phase: "PURVAKARMA", dayOffset: 2, procedureName: "Snehapana (ghee, day 3)", durationMin: 45, materials: [{ itemName: "Mahatiktaka Ghrita", quantity: 90, unit: "ml" }] },
        { phase: "PURVAKARMA", dayOffset: 3, procedureName: "Abhyanga + Swedana", durationMin: 75, materials: [{ itemName: "Ksheerabala Taila", quantity: 100, unit: "ml" }] },
        { phase: "PURVAKARMA", dayOffset: 4, procedureName: "Abhyanga + Swedana", durationMin: 75, materials: [{ itemName: "Ksheerabala Taila", quantity: 100, unit: "ml" }] },
        { phase: "PRADHANAKARMA", dayOffset: 5, procedureName: "Virechana (purgation)", durationMin: 180, materials: [{ itemName: "Trivrit Lehyam", quantity: 40, unit: "g" }] },
        { phase: "PASCHATKARMA", dayOffset: 6, procedureName: "Samsarjana krama — peya", durationMin: 30, isRestDay: true },
        { phase: "PASCHATKARMA", dayOffset: 7, procedureName: "Samsarjana krama — vilepi", durationMin: 30, isRestDay: true },
        { phase: "PASCHATKARMA", dayOffset: 8, procedureName: "Samsarjana krama — yusha", durationMin: 30, isRestDay: true },
        { phase: "PASCHATKARMA", dayOffset: 10, procedureName: "Review + Abhyanga", durationMin: 60, materials: [{ itemName: "Ksheerabala Taila", quantity: 80, unit: "ml" }] },
        { phase: "PASCHATKARMA", dayOffset: 13, procedureName: "Closing consultation", durationMin: 30 },
      ],
    },
    {
      name: "Kati Basti + Basti — lumbar protocol",
      therapyType: "BASTI",
      description:
        "For chronic low-back pain: localised oil pooling over the lumbar spine, then a course of medicated enemas in Kala Basti sequence.",
      totalDays: 16,
      steps: [
        { phase: "PURVAKARMA", dayOffset: 0, procedureName: "Abhyanga (lumbar focus)", durationMin: 60, materials: [{ itemName: "Ksheerabala Taila", quantity: 120, unit: "ml" }] },
        { phase: "PURVAKARMA", dayOffset: 1, procedureName: "Abhyanga + Swedana", durationMin: 75, materials: [{ itemName: "Ksheerabala Taila", quantity: 120, unit: "ml" }] },
        { phase: "PURVAKARMA", dayOffset: 2, procedureName: "Kati Basti", durationMin: 60, materials: [{ itemName: "Sahacharadi Taila", quantity: 150, unit: "ml" }] },
        { phase: "PRADHANAKARMA", dayOffset: 3, procedureName: "Anuvasana Basti", durationMin: 45, materials: [{ itemName: "Sahacharadi Taila", quantity: 60, unit: "ml" }] },
        { phase: "PRADHANAKARMA", dayOffset: 4, procedureName: "Niruha Basti", durationMin: 60, materials: [{ itemName: "Dashamoola Kwatha", quantity: 400, unit: "ml" }] },
        { phase: "PRADHANAKARMA", dayOffset: 5, procedureName: "Anuvasana Basti", durationMin: 45, materials: [{ itemName: "Sahacharadi Taila", quantity: 60, unit: "ml" }] },
        { phase: "PRADHANAKARMA", dayOffset: 7, procedureName: "Niruha Basti", durationMin: 60, materials: [{ itemName: "Dashamoola Kwatha", quantity: 400, unit: "ml" }] },
        { phase: "PRADHANAKARMA", dayOffset: 8, procedureName: "Anuvasana Basti", durationMin: 45, materials: [{ itemName: "Sahacharadi Taila", quantity: 60, unit: "ml" }] },
        { phase: "PASCHATKARMA", dayOffset: 10, procedureName: "Rest and diet review", durationMin: 30, isRestDay: true },
        { phase: "PASCHATKARMA", dayOffset: 12, procedureName: "Abhyanga + review", durationMin: 60, materials: [{ itemName: "Ksheerabala Taila", quantity: 100, unit: "ml" }] },
        { phase: "PASCHATKARMA", dayOffset: 15, procedureName: "Closing consultation", durationMin: 30 },
      ],
    },
    {
      name: "Shirodhara — 7 day calm protocol",
      therapyType: "SHIRODHARA",
      description:
        "For insomnia and anxiety with Vata aggravation: daily oil stream over the forehead preceded by short head-and-shoulder oleation.",
      totalDays: 7,
      steps: [
        { phase: "PURVAKARMA", dayOffset: 0, procedureName: "Shiro Abhyanga", durationMin: 30, materials: [{ itemName: "Brahmi Taila", quantity: 60, unit: "ml" }] },
        ...[1, 2, 3, 4, 5].map((d) => ({
          phase: "PRADHANAKARMA" as const,
          dayOffset: d,
          procedureName: "Shirodhara",
          durationMin: 60,
          materials: [{ itemName: "Brahmi Taila", quantity: 200, unit: "ml" }],
        })),
        { phase: "PASCHATKARMA", dayOffset: 6, procedureName: "Review + lifestyle counselling", durationMin: 30 },
      ],
    },
    {
      name: "Nasya — 7 day sinus protocol",
      therapyType: "NASYA",
      description:
        "For chronic sinusitis: facial oleation and steam, then graded nasal instillation of medicated oil.",
      totalDays: 7,
      steps: [
        { phase: "PURVAKARMA", dayOffset: 0, procedureName: "Mukha Abhyanga + Nadi Swedana", durationMin: 30, materials: [{ itemName: "Ksheerabala Taila", quantity: 40, unit: "ml" }] },
        ...[1, 2, 3, 4].map((d) => ({
          phase: "PRADHANAKARMA" as const,
          dayOffset: d,
          procedureName: "Nasya (Anu Taila)",
          durationMin: 30,
          materials: [{ itemName: "Anu Taila", quantity: 10, unit: "ml" }],
        })),
        { phase: "PASCHATKARMA", dayOffset: 5, procedureName: "Dhoomapana + review", durationMin: 30 },
        { phase: "PASCHATKARMA", dayOffset: 6, procedureName: "Closing consultation", durationMin: 30 },
      ],
    },
  ];

  const templates = [];
  for (const spec of templateSpecs) {
    const created = await db.protocolTemplate.create({
      data: {
        name: spec.name,
        therapyType: spec.therapyType,
        description: spec.description,
        totalDays: spec.totalDays,
        steps: {
          create: spec.steps.map((s) => ({
            phase: s.phase,
            dayOffset: s.dayOffset,
            procedureName: s.procedureName,
            durationMin: s.durationMin,
            isRestDay: s.isRestDay ?? false,
            materials: s.materials ?? undefined,
          })),
        },
      },
      include: { steps: true },
    });
    templates.push(created);
  }

  // ── Inventory ──────────────────────────────────────────────
  console.log("→ Creating inventory…");

  const itemSpecs = [
    { name: "Ksheerabala Taila", category: "OIL" as const, unit: "ml", reorder: 2000, cost: 3.2 },
    { name: "Sahacharadi Taila", category: "OIL" as const, unit: "ml", reorder: 1500, cost: 3.8 },
    { name: "Brahmi Taila", category: "OIL" as const, unit: "ml", reorder: 2000, cost: 2.9 },
    { name: "Anu Taila", category: "OIL" as const, unit: "ml", reorder: 500, cost: 6.5 },
    { name: "Mahatiktaka Ghrita", category: "GHEE" as const, unit: "ml", reorder: 1000, cost: 5.4 },
    { name: "Trivrit Lehyam", category: "POWDER" as const, unit: "g", reorder: 500, cost: 4.1 },
    { name: "Dashamoola Kwatha", category: "DECOCTION" as const, unit: "ml", reorder: 3000, cost: 1.8 },
    { name: "Triphala Churna", category: "POWDER" as const, unit: "g", reorder: 1000, cost: 2.2 },
    { name: "Cotton gauze", category: "CONSUMABLE" as const, unit: "piece", reorder: 200, cost: 4 },
    { name: "Disposable sheets", category: "CONSUMABLE" as const, unit: "piece", reorder: 300, cost: 12 },
  ];

  for (const [i, spec] of itemSpecs.entries()) {
    // Two items are deliberately left below reorder level, and two batches
    // expire within the month, so the alert surfaces have something to show.
    const isLow = i === 3 || i === 5;
    const expiresSoon = i === 1 || i === 6;

    await db.inventoryItem.create({
      data: {
        name: spec.name,
        category: spec.category,
        unit: spec.unit,
        reorderLevel: spec.reorder,
        unitCost: spec.cost,
        batches: {
          create: [
            {
              batchNo: `B${2026}${String(i + 1).padStart(3, "0")}A`,
              quantity: isLow ? spec.reorder * 0.4 : spec.reorder * 2.5,
              expiryDate: expiresSoon ? daysFromNow(randInt(8, 25)) : daysFromNow(randInt(200, 500)),
              supplier: pick(["Kottakkal Arya Vaidya Sala", "Vaidyaratnam", "Nagarjuna Herbal"]),
            },
          ],
        },
      },
    });
  }

  // ── Patients ───────────────────────────────────────────────
  console.log("→ Creating patients, plans and sessions…");

  const roomInputs: RoomInput[] = rooms.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
  }));

  const therapistInputs: TherapistInput[] = therapists.map((t) => ({
    id: t.id,
    name: t.employeeCode,
    expertise: t.expertise,
    availability: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      startMinute: 8 * 60,
      endMinute: 18 * 60,
    })),
    timeOff: [],
  }));

  // Accumulates as plans are scheduled, so patients never collide.
  const bookings: ExistingBooking[] = [];

  const PATIENT_COUNT = 24;

  for (let i = 0; i < PATIENT_COUNT; i++) {
    const isDemoPatient = i === 0;
    const firstName = isDemoPatient ? "Meera" : FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = isDemoPatient ? "Raghavan" : pick(LAST_NAMES);
    const email = isDemoPatient
      ? "patient@chikitsa.dev"
      : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    const age = randInt(24, 68);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);

    const condition = pick(CONDITIONS);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: "PATIENT",
        firstName,
        lastName,
        phone: `9${randInt(100000000, 999999999)}`,
        patient: {
          create: {
            mrn: `CC-2026-${String(i + 1).padStart(5, "0")}`,
            dateOfBirth: dob,
            gender: pick(["MALE", "FEMALE", "FEMALE", "MALE", "OTHER"] as const),
            bloodGroup: pick(["A+", "B+", "O+", "AB+", "O-", "A-"]),
            city: pick(["Bengaluru", "Mysuru", "Kochi", "Chennai", "Hyderabad"]),
            occupation: pick(["Software engineer", "Teacher", "Homemaker", "Accountant", "Retired", "Business owner"]),
            chronicConditions: condition || null,
            emergencyContact: `9${randInt(100000000, 999999999)}`,
          },
        },
      },
      include: { patient: true },
    });

    const patient = user.patient!;

    // ── Dosha assessments: one Prakriti, one recent Vikriti ──
    const prakritiDominant = pick(["VATA", "PITTA", "KAPHA"] as Dosha[]);
    const prakriti = buildScores(prakritiDominant, 20);
    await db.doshaAssessment.create({
      data: {
        patientId: patient.id,
        type: "PRAKRITI",
        vataScore: prakriti.VATA,
        pittaScore: prakriti.PITTA,
        kaphaScore: prakriti.KAPHA,
        dominant: prakritiDominant,
        responses: {},
        assessedById: pick(doctors).id,
        createdAt: daysFromNow(-randInt(60, 180)),
      },
    });

    // Vikriti drifts away from baseline — that drift is the thing treatment
    // is trying to close.
    const aggravated = pick(["VATA", "PITTA", "KAPHA"] as Dosha[]);
    const vikriti = shiftScores(prakriti, aggravated, randInt(12, 24));
    await db.doshaAssessment.create({
      data: {
        patientId: patient.id,
        type: "VIKRITI",
        vataScore: vikriti.VATA,
        pittaScore: vikriti.PITTA,
        kaphaScore: vikriti.KAPHA,
        dominant: dominantOf(vikriti),
        responses: {},
        assessedById: pick(doctors).id,
        createdAt: daysFromNow(-randInt(5, 40)),
      },
    });

    // ── Consultation ────────────────────────────────────────
    const caseSpec = COMPLAINTS[i % COMPLAINTS.length];
    const doctor = doctors[i % doctors.length];
    const consultDate = daysFromNow(-randInt(10, 45));

    const consultation = await db.consultation.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        scheduledAt: consultDate,
        status: "COMPLETED",
        chiefComplaint: caseSpec.complaint,
        symptoms: [
          { name: caseSpec.complaint, severity: randInt(5, 9), durationDays: randInt(30, 400) },
        ],
        examination: "Nadi pariksha shows irregular gati. Jihva with mild ama coating.",
        diagnosis: caseSpec.dx,
        ayurvedicDx: `${caseSpec.dx} — ${aggravated.toLowerCase()} predominance`,
        doctorNotes: "Advised shodhana followed by rasayana. Diet counselling given.",
        followUpInDays: 30,
        fee: doctor.consultationFee,
        prescriptions: {
          create: [
            {
              medicineName: pick(["Triphala Churna", "Ashwagandha Churna", "Guggulu tablets", "Avipattikar Churna"]),
              dosage: pick(["3 g", "500 mg", "5 ml"]),
              frequency: pick(["Twice daily", "At bedtime", "Before meals"]),
              durationDays: randInt(14, 60),
              anupana: pick(["Warm water", "Honey", "Milk"]),
            },
          ],
        },
      },
    });

    // ── Therapy plan ────────────────────────────────────────
    const template = templates.find((t) => t.therapyType === caseSpec.therapy) ?? pick(templates);

    // Spread patients across time: some finished, some mid-treatment, some
    // starting soon. Patient 0 (the demo login) is deliberately mid-treatment
    // so their dashboard has both history and upcoming sessions.
    const startOffset = isDemoPatient
      ? -Math.floor(template.totalDays / 2)
      : randInt(-45, 12);

    const startDate = daysFromNow(startOffset);
    const endDate = daysFromNow(startOffset + template.totalDays - 1);

    const planned = expandProtocol(
      template.steps.map((s) => ({
        phase: s.phase,
        dayOffset: s.dayOffset,
        procedureName: s.procedureName,
        durationMin: s.durationMin,
        isRestDay: s.isRestDay,
      })),
      startDate,
    );

    const { scheduled } = schedulePlan({
      sessions: planned,
      therapyType: template.therapyType,
      therapists: therapistInputs,
      rooms: roomInputs,
      existingBookings: bookings,
    });

    const now = new Date();
    const status =
      endDate < now ? "COMPLETED" : startDate > now ? "DRAFT" : "ACTIVE";

    const plan = await db.therapyPlan.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        consultationId: consultation.id,
        templateId: template.id,
        therapyType: template.therapyType,
        status,
        startDate,
        endDate,
        totalDays: template.totalDays,
        goals: `Reduce ${caseSpec.dx.split("(")[0].trim()} severity and restore ${prakritiDominant.toLowerCase()} balance.`,
        contraindicationsChecked: true,
        contraindicationNotes: condition ? `Noted: ${condition}. Protocol adjusted.` : null,
      },
    });

    // Sessions that are in the past get completed (with the odd miss), future
    // ones stay scheduled.
    for (const s of scheduled) {
      const isPast = s.scheduledEnd < now;
      const sessionStatus: SessionStatus = isPast
        ? rand() < 0.08
          ? "MISSED"
          : "COMPLETED"
        : rand() < 0.3
          ? "CONFIRMED"
          : "SCHEDULED";

      const created = await db.therapySession.create({
        data: {
          planId: plan.id,
          therapistId: s.therapistId,
          roomId: s.roomId,
          phase: s.phase,
          procedureName: s.procedureName,
          dayNumber: s.dayNumber,
          scheduledStart: s.scheduledStart,
          scheduledEnd: s.scheduledEnd,
          status: sessionStatus,
          actualStart: sessionStatus === "COMPLETED" ? s.scheduledStart : null,
          actualEnd: sessionStatus === "COMPLETED" ? s.scheduledEnd : null,
          preVitals:
            sessionStatus === "COMPLETED"
              ? { bp: `${randInt(110, 135)}/${randInt(70, 88)}`, pulse: randInt(64, 88), weight: randInt(52, 88) }
              : undefined,
          postVitals:
            sessionStatus === "COMPLETED"
              ? { bp: `${randInt(108, 128)}/${randInt(68, 84)}`, pulse: randInt(60, 80) }
              : undefined,
          therapistNotes:
            sessionStatus === "COMPLETED"
              ? pick([
                  "Patient tolerated the procedure well. No adverse reaction.",
                  "Mild fatigue reported afterwards; advised rest and warm water.",
                  "Good response. Stiffness visibly reduced by the end of the session.",
                  "Slight discomfort at the start, settled within ten minutes.",
                ])
              : null,
        },
      });

      bookings.push({
        therapistId: s.therapistId,
        roomId: s.roomId,
        start: s.scheduledStart,
        end: s.scheduledEnd,
      });

      if (sessionStatus === "COMPLETED" && rand() < 0.7) {
        await db.sessionFeedback.create({
          data: {
            sessionId: created.id,
            patientId: patient.id,
            comfortRating: randInt(3, 5),
            symptomSeverity: randInt(2, 7),
            energyLevel: randInt(4, 9),
            notes: rand() < 0.3 ? pick(["Felt lighter afterwards.", "Slept much better that night.", "Some soreness but manageable."]) : null,
          },
        });
      }
    }

    // ── Progress entries: a believable improvement curve ─────
    const completedCount = scheduled.filter((s) => s.scheduledEnd < now).length;
    if (completedCount > 0) {
      const baselineSeverity = randInt(7, 9);
      for (let d = 0; d < Math.min(completedCount, 10); d++) {
        // Improvement trends downward with a little noise, so charts look
        // clinically plausible rather than a straight line.
        const progressRatio = d / Math.max(completedCount - 1, 1);
        const severity = Math.max(
          1,
          Math.round(baselineSeverity - progressRatio * randInt(3, 5) + (rand() - 0.5)),
        );
        await db.progressEntry.create({
          data: {
            patientId: patient.id,
            planId: plan.id,
            recordedAt: daysFromNow(startOffset + d * 2),
            symptomSeverity: severity,
            energyLevel: Math.min(10, Math.round(4 + progressRatio * 4 + (rand() - 0.5))),
            sleepQuality: Math.min(10, Math.round(4 + progressRatio * 4 + (rand() - 0.5))),
            digestion: Math.min(10, Math.round(5 + progressRatio * 3 + (rand() - 0.5))),
            mood: Math.min(10, Math.round(5 + progressRatio * 3 + (rand() - 0.5))),
            weightKg: randInt(52, 88) + Math.round(rand() * 10) / 10,
          },
        });
      }
    }

    // ── Diet plan ───────────────────────────────────────────
    await db.dietPlan.create({
      data: {
        patientId: patient.id,
        planId: plan.id,
        title: `Pathya-Apathya for ${aggravated.toLowerCase()} pacification`,
        targetDosha: aggravated,
        startDate,
        endDate,
        guidance:
          "Eat at consistent times. Favour freshly cooked, warm, lightly spiced food. Avoid eating within three hours of sleeping.",
        items: {
          create: DIET_BY_DOSHA[aggravated],
        },
      },
    });

    // ── Invoice ─────────────────────────────────────────────
    const sessionCount = scheduled.length;
    const sessionRate = 1200;
    const subtotal = Number(doctor.consultationFee) + sessionCount * sessionRate;
    const taxRate = 5;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const total = subtotal + taxAmount;
    const invoiceStatus =
      status === "COMPLETED" ? (rand() < 0.8 ? "PAID" : "OVERDUE") : rand() < 0.5 ? "PARTIALLY_PAID" : "SENT";
    const amountPaid =
      invoiceStatus === "PAID" ? total : invoiceStatus === "PARTIALLY_PAID" ? Math.round(total / 2) : 0;

    const invoice = await db.invoice.create({
      data: {
        invoiceNo: `INV-2026-${String(i + 1).padStart(4, "0")}`,
        patientId: patient.id,
        issuedAt: consultDate,
        dueAt: daysFromNow(startOffset + 15),
        status: invoiceStatus,
        subtotal,
        taxRate,
        taxAmount,
        total,
        amountPaid,
        lines: {
          create: [
            {
              description: "Consultation",
              quantity: 1,
              unitPrice: doctor.consultationFee,
              amount: doctor.consultationFee,
              consultationId: consultation.id,
            },
            {
              description: `${template.name} — ${sessionCount} sessions`,
              quantity: sessionCount,
              unitPrice: sessionRate,
              amount: sessionCount * sessionRate,
            },
          ],
        },
      },
    });

    if (amountPaid > 0) {
      await db.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: amountPaid,
          method: pick(["UPI", "CARD", "CASH", "BANK_TRANSFER"] as const),
          reference: `TXN${randInt(100000, 999999)}`,
          paidAt: daysFromNow(startOffset + randInt(1, 10)),
        },
      });
    }

    // ── Notifications for the demo patient ──────────────────
    if (isDemoPatient) {
      await db.notification.createMany({
        data: [
          {
            userId: user.id,
            type: "SESSION_REMINDER",
            title: "Session tomorrow at 8:00 AM",
            body: "Please arrive on an empty stomach and wear loose clothing.",
            link: "/patient/schedule",
          },
          {
            userId: user.id,
            type: "PLAN_STARTED",
            title: `${template.name} has begun`,
            body: "Your therapy plan is now active. Check today's instructions on your dashboard.",
            link: "/patient",
          },
          {
            userId: user.id,
            type: "INVOICE_ISSUED",
            title: `Invoice ${invoice.invoiceNo} issued`,
            body: `Amount due: ₹${total - amountPaid}`,
            link: "/patient/invoices",
            readAt: new Date(),
          },
        ],
      });
    }
  }

  // ── Audit trail ────────────────────────────────────────────
  const admin = await db.user.findUnique({ where: { email: "admin@chikitsa.dev" } });
  if (admin) {
    await db.auditLog.createMany({
      data: Array.from({ length: 12 }).map((_, i) => ({
        actorId: admin.id,
        action: pick(["plan.create", "session.complete", "inventory.adjust", "invoice.issue", "staff.update"]),
        entity: pick(["TherapyPlan", "TherapySession", "InventoryItem", "Invoice", "User"]),
        entityId: `seed-${i}`,
        ip: "127.0.0.1",
        createdAt: daysFromNow(-randInt(1, 30)),
      })),
    });
  }

  const counts = {
    users: await db.user.count(),
    patients: await db.patientProfile.count(),
    plans: await db.therapyPlan.count(),
    sessions: await db.therapySession.count(),
    invoices: await db.invoice.count(),
    progress: await db.progressEntry.count(),
  };

  console.log("\n✓ Seed complete");
  console.table(counts);
  console.log(`\n  Demo password for every account: ${DEMO_PASSWORD}`);
  console.log("  patient@chikitsa.dev · doctor@chikitsa.dev · therapist@chikitsa.dev · admin@chikitsa.dev\n");
}

// ── helpers ──────────────────────────────────────────────────

type Scores = { VATA: number; PITTA: number; KAPHA: number };

/** Builds percentages summing to 100 with `dominant` ahead by `lead` points. */
function buildScores(dominant: Dosha, lead: number): Scores {
  const base = Math.floor((100 - lead) / 3);
  const scores: Scores = { VATA: base, PITTA: base, KAPHA: base };
  scores[dominant] += 100 - base * 3;
  return scores;
}

/** Pushes `dosha` up by `amount`, taking it proportionally from the others. */
function shiftScores(base: Scores, dosha: Dosha, amount: number): Scores {
  const others = (["VATA", "PITTA", "KAPHA"] as Dosha[]).filter((d) => d !== dosha);
  const out: Scores = { ...base };
  out[dosha] += amount;
  const half = Math.floor(amount / 2);
  out[others[0]] -= half;
  out[others[1]] -= amount - half;
  for (const d of ["VATA", "PITTA", "KAPHA"] as Dosha[]) {
    out[d] = Math.max(0, out[d]);
  }
  // Re-normalise so it still totals 100.
  const total = out.VATA + out.PITTA + out.KAPHA;
  out[dosha] += 100 - total;
  return out;
}

function dominantOf(s: Scores): Dosha {
  return (["VATA", "PITTA", "KAPHA"] as Dosha[]).reduce((best, d) =>
    s[d] > s[best] ? d : best,
  );
}

const DIET_BY_DOSHA: Record<
  Dosha,
  { category: "PATHYA" | "APATHYA"; mealTime: string; item: string; notes?: string }[]
> = {
  VATA: [
    { category: "PATHYA", mealTime: "Breakfast", item: "Warm rice porridge with ghee" },
    { category: "PATHYA", mealTime: "Lunch", item: "Cooked vegetables, moong dal, ghee" },
    { category: "PATHYA", mealTime: "Anytime", item: "Warm water with ginger" },
    { category: "APATHYA", mealTime: "Anytime", item: "Raw salads and cold drinks", notes: "Aggravates dryness and cold" },
    { category: "APATHYA", mealTime: "Anytime", item: "Carbonated drinks, dry snacks" },
  ],
  PITTA: [
    { category: "PATHYA", mealTime: "Breakfast", item: "Sweet fruits, soaked almonds" },
    { category: "PATHYA", mealTime: "Lunch", item: "Rice, bitter gourd, coconut" },
    { category: "PATHYA", mealTime: "Anytime", item: "Coriander or fennel water" },
    { category: "APATHYA", mealTime: "Anytime", item: "Chillies, pickles, fermented food", notes: "Increases heat and acidity" },
    { category: "APATHYA", mealTime: "Anytime", item: "Alcohol and strong coffee" },
  ],
  KAPHA: [
    { category: "PATHYA", mealTime: "Breakfast", item: "Light millet upma, ginger tea" },
    { category: "PATHYA", mealTime: "Lunch", item: "Barley, steamed greens, black pepper" },
    { category: "PATHYA", mealTime: "Anytime", item: "Warm water with honey" },
    { category: "APATHYA", mealTime: "Anytime", item: "Dairy, fried food, sweets", notes: "Increases heaviness and congestion" },
    { category: "APATHYA", mealTime: "Anytime", item: "Daytime sleeping" },
  ],
};

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
