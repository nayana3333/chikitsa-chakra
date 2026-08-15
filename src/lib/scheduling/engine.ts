import type {
  TherapyPhase,
  TherapyType,
  RoomType,
} from "@/generated/prisma/enums";

/**
 * Therapy scheduling engine.
 *
 * Pure functions over plain data — no Prisma client, no React, no I/O. The
 * caller loads therapists, rooms and existing bookings, hands them in, and gets
 * back a proposed plan plus an explicit list of anything that could not be
 * placed and why. That separation is what makes this testable, and it means a
 * failed placement produces a reason a receptionist can act on rather than a
 * silent gap in the calendar.
 */

// ─────────────────────────────────────────────────────────────
// Inputs
// ─────────────────────────────────────────────────────────────

export interface Interval {
  start: Date;
  end: Date;
}

/** One step of a protocol template, relative to the plan's start date. */
export interface ProtocolStepInput {
  phase: TherapyPhase;
  dayOffset: number;
  procedureName: string;
  durationMin: number;
  isRestDay: boolean;
}

export interface AvailabilityRuleInput {
  dayOfWeek: number; // 0 = Sunday
  startMinute: number; // minutes from midnight
  endMinute: number;
}

export interface TherapistInput {
  id: string;
  name: string;
  expertise: TherapyType[];
  availability: AvailabilityRuleInput[];
  timeOff: Interval[];
}

export interface RoomInput {
  id: string;
  name: string;
  type: RoomType;
}

/** An already-committed booking that new sessions must not collide with. */
export interface ExistingBooking extends Interval {
  therapistId: string | null;
  roomId: string | null;
}

export interface SchedulingOptions {
  /** Clinic opening time, minutes from midnight. Default 08:00. */
  dayStartMinute?: number;
  /** Clinic closing time. Default 18:00. */
  dayEndMinute?: number;
  /** Gap between sessions for room turnaround. Default 15 min. */
  bufferMin?: number;
  /** Granularity of candidate start times. Default 15 min. */
  slotStepMin?: number;
  /** Weekdays the clinic is shut, 0 = Sunday. Default [0]. */
  closedDays?: number[];
}

const DEFAULTS: Required<SchedulingOptions> = {
  dayStartMinute: 8 * 60,
  dayEndMinute: 18 * 60,
  bufferMin: 15,
  slotStepMin: 15,
  closedDays: [0],
};

// Which room type each therapy needs. Getting this wrong in a real clinic means
// a patient booked for Basti in a room with no facility for it.
const ROOM_FOR_THERAPY: Record<TherapyType, RoomType> = {
  VAMANA: "THERAPY_TABLE",
  VIRECHANA: "THERAPY_TABLE",
  BASTI: "BASTI_ROOM",
  NASYA: "THERAPY_TABLE",
  RAKTAMOKSHANA: "THERAPY_TABLE",
  ABHYANGA: "THERAPY_TABLE",
  SHIRODHARA: "THERAPY_TABLE",
  SWEDANA: "STEAM_CHAMBER",
  UDVARTANA: "THERAPY_TABLE",
  KATI_BASTI: "THERAPY_TABLE",
};

// ─────────────────────────────────────────────────────────────
// Outputs
// ─────────────────────────────────────────────────────────────

export interface PlannedSession {
  dayNumber: number; // 1-based
  phase: TherapyPhase;
  procedureName: string;
  durationMin: number;
  isRestDay: boolean;
  date: Date; // midnight of the session's day
}

export interface ScheduledSession extends PlannedSession {
  therapistId: string;
  roomId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}

export type UnscheduledReason =
  | "CLINIC_CLOSED"
  | "NO_THERAPIST_WITH_EXPERTISE"
  | "NO_THERAPIST_AVAILABLE"
  | "NO_ROOM_AVAILABLE"
  | "NO_SLOT_IN_WORKING_HOURS";

export interface UnscheduledSession {
  session: PlannedSession;
  reason: UnscheduledReason;
  detail: string;
}

export interface ScheduleResult {
  scheduled: ScheduledSession[];
  unscheduled: UnscheduledSession[];
  restDays: PlannedSession[];
}

// ─────────────────────────────────────────────────────────────
// Date helpers (local-time, integer minute arithmetic)
// ─────────────────────────────────────────────────────────────

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Builds a Date at a given minute-of-day on the given calendar day. */
export function atMinute(day: Date, minute: number): Date {
  const d = startOfDay(day);
  d.setMinutes(minute);
  return d;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/**
 * Half-open overlap test: a session ending exactly when another begins does
 * *not* count as a clash, which is what lets back-to-back bookings work.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

// ─────────────────────────────────────────────────────────────
// Step 1 — expand a protocol template into dated sessions
// ─────────────────────────────────────────────────────────────

/**
 * Lays a protocol's steps onto the calendar from a start date.
 *
 * Panchakarma phases must run in order — Purvakarma prepares the body,
 * Pradhanakarma is the main procedure, Paschatkarma restores. Steps are sorted
 * by day offset and then by phase so a template with a mis-ordered row still
 * produces a clinically coherent sequence.
 */
export function expandProtocol(
  steps: ProtocolStepInput[],
  startDate: Date,
): PlannedSession[] {
  const PHASE_ORDER: Record<TherapyPhase, number> = {
    PURVAKARMA: 0,
    PRADHANAKARMA: 1,
    PASCHATKARMA: 2,
  };

  return [...steps]
    .sort(
      (a, b) =>
        a.dayOffset - b.dayOffset || PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase],
    )
    .map((step) => ({
      dayNumber: step.dayOffset + 1,
      phase: step.phase,
      procedureName: step.procedureName,
      durationMin: step.durationMin,
      isRestDay: step.isRestDay,
      date: startOfDay(addDays(startDate, step.dayOffset)),
    }));
}

// ─────────────────────────────────────────────────────────────
// Step 2 — availability
// ─────────────────────────────────────────────────────────────

/** Is the therapist rostered and not on leave for the whole interval? */
export function isTherapistFree(
  therapist: TherapistInput,
  interval: Interval,
  bookings: ExistingBooking[],
): boolean {
  const day = interval.start.getDay();
  const startMin = minutesBetween(startOfDay(interval.start), interval.start);
  const endMin = minutesBetween(startOfDay(interval.start), interval.end);

  const rostered = therapist.availability.some(
    (rule) =>
      rule.dayOfWeek === day &&
      startMin >= rule.startMinute &&
      endMin <= rule.endMinute,
  );
  if (!rostered) return false;

  if (therapist.timeOff.some((off) => overlaps(off, interval))) return false;

  return !bookings.some(
    (b) => b.therapistId === therapist.id && overlaps(b, interval),
  );
}

export function isRoomFree(
  room: RoomInput,
  interval: Interval,
  bookings: ExistingBooking[],
): boolean {
  return !bookings.some((b) => b.roomId === room.id && overlaps(b, interval));
}

// ─────────────────────────────────────────────────────────────
// Step 3 — place the plan
// ─────────────────────────────────────────────────────────────

/**
 * Assigns a therapist, a room, and a time to every session in a plan.
 *
 * Strategy is earliest-fit: for each session walk candidate start times from
 * the clinic's opening, and take the first where a qualified therapist and a
 * suitable room are both free. Sessions are placed in calendar order, and each
 * placement is added to the working booking list so later sessions in the same
 * plan cannot be double-booked against earlier ones.
 *
 * Earliest-fit rather than an optimiser because clinics genuinely prefer
 * morning slots for Panchakarma (procedures are done on an empty stomach), and
 * because a greedy pass produces a result a human can predict and override.
 */
export function schedulePlan(params: {
  sessions: PlannedSession[];
  therapyType: TherapyType;
  therapists: TherapistInput[];
  rooms: RoomInput[];
  existingBookings: ExistingBooking[];
  options?: SchedulingOptions;
}): ScheduleResult {
  const opts = { ...DEFAULTS, ...params.options };
  const { sessions, therapyType, therapists, rooms } = params;

  // Working copy so placements within this plan block each other too.
  const bookings: ExistingBooking[] = [...params.existingBookings];

  const scheduled: ScheduledSession[] = [];
  const unscheduled: UnscheduledSession[] = [];
  const restDays: PlannedSession[] = [];

  const qualified = therapists.filter((t) => t.expertise.includes(therapyType));
  const requiredRoomType = ROOM_FOR_THERAPY[therapyType];
  const suitableRooms = rooms.filter((r) => r.type === requiredRoomType);

  const ordered = [...sessions].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.dayNumber - b.dayNumber,
  );

  for (const session of ordered) {
    // Rest days are part of the protocol but consume no resources — the patient
    // is on prescribed rest and diet, not in the clinic.
    if (session.isRestDay) {
      restDays.push(session);
      continue;
    }

    if (opts.closedDays.includes(session.date.getDay())) {
      unscheduled.push({
        session,
        reason: "CLINIC_CLOSED",
        detail: `Day ${session.dayNumber} falls on a day the clinic is closed.`,
      });
      continue;
    }

    if (qualified.length === 0) {
      unscheduled.push({
        session,
        reason: "NO_THERAPIST_WITH_EXPERTISE",
        detail: `No therapist is qualified in ${therapyType}.`,
      });
      continue;
    }

    if (suitableRooms.length === 0) {
      unscheduled.push({
        session,
        reason: "NO_ROOM_AVAILABLE",
        detail: `No room of type ${requiredRoomType} exists.`,
      });
      continue;
    }

    const placement = findEarliestPlacement(
      session,
      qualified,
      suitableRooms,
      bookings,
      opts,
    );

    if (!placement) {
      unscheduled.push({
        session,
        reason: "NO_SLOT_IN_WORKING_HOURS",
        detail: `Day ${session.dayNumber}: no ${session.durationMin}-minute window with both a therapist and a ${requiredRoomType} free.`,
      });
      continue;
    }

    scheduled.push(placement);
    // Reserve it, plus the turnaround buffer, against subsequent sessions.
    bookings.push({
      therapistId: placement.therapistId,
      roomId: placement.roomId,
      start: placement.scheduledStart,
      end: new Date(placement.scheduledEnd.getTime() + opts.bufferMin * 60000),
    });
  }

  return { scheduled, unscheduled, restDays };
}

function findEarliestPlacement(
  session: PlannedSession,
  therapists: TherapistInput[],
  rooms: RoomInput[],
  bookings: ExistingBooking[],
  opts: Required<SchedulingOptions>,
): ScheduledSession | null {
  const latestStart = opts.dayEndMinute - session.durationMin;

  for (
    let minute = opts.dayStartMinute;
    minute <= latestStart;
    minute += opts.slotStepMin
  ) {
    const start = atMinute(session.date, minute);
    const end = new Date(start.getTime() + session.durationMin * 60000);
    const interval: Interval = { start, end };

    const therapist = therapists.find((t) =>
      isTherapistFree(t, interval, bookings),
    );
    if (!therapist) continue;

    const room = rooms.find((r) => isRoomFree(r, interval, bookings));
    if (!room) continue;

    return {
      ...session,
      therapistId: therapist.id,
      roomId: room.id,
      scheduledStart: start,
      scheduledEnd: end,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Rescheduling
// ─────────────────────────────────────────────────────────────

/**
 * Finds alternative slots for a single session — what the therapist's
 * "propose a reschedule" action offers the patient.
 */
export function findAlternativeSlots(params: {
  session: PlannedSession;
  therapyType: TherapyType;
  therapists: TherapistInput[];
  rooms: RoomInput[];
  existingBookings: ExistingBooking[];
  searchDays?: number;
  maxResults?: number;
  options?: SchedulingOptions;
}): ScheduledSession[] {
  const opts = { ...DEFAULTS, ...params.options };
  const searchDays = params.searchDays ?? 7;
  const maxResults = params.maxResults ?? 5;

  const qualified = params.therapists.filter((t) =>
    t.expertise.includes(params.therapyType),
  );
  const suitableRooms = params.rooms.filter(
    (r) => r.type === ROOM_FOR_THERAPY[params.therapyType],
  );

  const results: ScheduledSession[] = [];

  for (let offset = 0; offset < searchDays && results.length < maxResults; offset++) {
    const date = startOfDay(addDays(params.session.date, offset));
    if (opts.closedDays.includes(date.getDay())) continue;

    const placement = findEarliestPlacement(
      { ...params.session, date },
      qualified,
      suitableRooms,
      // Exclude slots already offered so the list isn't five copies of one time.
      [
        ...params.existingBookings,
        ...results.map((r) => ({
          therapistId: r.therapistId,
          roomId: r.roomId,
          start: r.scheduledStart,
          end: r.scheduledEnd,
        })),
      ],
      opts,
    );

    if (placement) results.push(placement);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Contraindications
// ─────────────────────────────────────────────────────────────

export interface ContraindicationContext {
  age: number | null;
  isPregnant?: boolean;
  conditions: string[];
}

export interface ContraindicationFinding {
  severity: "ABSOLUTE" | "RELATIVE";
  message: string;
}

/**
 * Classical contraindications (pratishedha) for the major procedures.
 *
 * This flags concerns for the prescribing doctor to acknowledge — it never
 * blocks a prescription. Clinical judgement belongs to the clinician; the
 * software's job is to make sure nothing was overlooked silently, and to record
 * that the check happened.
 */
export function checkContraindications(
  therapy: TherapyType,
  ctx: ContraindicationContext,
): ContraindicationFinding[] {
  const findings: ContraindicationFinding[] = [];
  const has = (...keys: string[]) =>
    ctx.conditions.some((c) =>
      keys.some((k) => c.toLowerCase().includes(k.toLowerCase())),
    );

  if (ctx.isPregnant) {
    if (
      therapy === "VAMANA" ||
      therapy === "VIRECHANA" ||
      therapy === "RAKTAMOKSHANA" ||
      therapy === "BASTI"
    ) {
      findings.push({
        severity: "ABSOLUTE",
        message: `${therapy} is contraindicated in pregnancy.`,
      });
    }
  }

  if (ctx.age !== null) {
    if (ctx.age < 12 && therapy !== "ABHYANGA") {
      findings.push({
        severity: "RELATIVE",
        message: "Patient is under 12 — shodhana procedures need dose adjustment.",
      });
    }
    if (ctx.age > 70) {
      findings.push({
        severity: "RELATIVE",
        message:
          "Patient is over 70 — consider a gentler protocol and shorter Purvakarma.",
      });
    }
  }

  if (therapy === "VAMANA" && has("hypertension", "heart", "cardiac")) {
    findings.push({
      severity: "ABSOLUTE",
      message: "Vamana is contraindicated with cardiac disease or hypertension.",
    });
  }

  if (therapy === "VIRECHANA" && has("ulcer", "colitis", "diarrhoea", "diarrhea")) {
    findings.push({
      severity: "ABSOLUTE",
      message: "Virechana is contraindicated with active bowel inflammation.",
    });
  }

  if (therapy === "RAKTAMOKSHANA" && has("anaemia", "anemia", "bleeding")) {
    findings.push({
      severity: "ABSOLUTE",
      message: "Raktamokshana is contraindicated in anaemia or bleeding disorders.",
    });
  }

  if (therapy === "SWEDANA" && has("diabetes")) {
    findings.push({
      severity: "RELATIVE",
      message:
        "Reduced sensation in diabetes raises burn risk — monitor temperature closely.",
    });
  }

  if (has("fever")) {
    findings.push({
      severity: "RELATIVE",
      message: "Active fever — defer shodhana until it settles.",
    });
  }

  return findings;
}

export { ROOM_FOR_THERAPY, DEFAULTS as SCHEDULING_DEFAULTS };
