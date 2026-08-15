import { describe, it, expect } from "vitest";
import {
  expandProtocol,
  schedulePlan,
  overlaps,
  isTherapistFree,
  findAlternativeSlots,
  checkContraindications,
  atMinute,
  startOfDay,
  type TherapistInput,
  type RoomInput,
  type ProtocolStepInput,
  type ExistingBooking,
} from "./engine";

// A Monday, so weekday availability rules apply predictably.
const MONDAY = startOfDay(new Date(2026, 7, 17));

const fullWeekAvailability = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  startMinute: 8 * 60,
  endMinute: 18 * 60,
}));

function therapist(overrides: Partial<TherapistInput> = {}): TherapistInput {
  return {
    id: "t1",
    name: "Asha",
    expertise: ["ABHYANGA", "SWEDANA", "VIRECHANA"],
    availability: fullWeekAvailability,
    timeOff: [],
    ...overrides,
  };
}

const table: RoomInput = { id: "r1", name: "Table 1", type: "THERAPY_TABLE" };
const steam: RoomInput = { id: "r2", name: "Steam 1", type: "STEAM_CHAMBER" };

function step(overrides: Partial<ProtocolStepInput> = {}): ProtocolStepInput {
  return {
    phase: "PURVAKARMA",
    dayOffset: 0,
    procedureName: "Abhyanga",
    durationMin: 60,
    isRestDay: false,
    ...overrides,
  };
}

describe("overlaps", () => {
  const base = { start: new Date(2026, 0, 1, 10), end: new Date(2026, 0, 1, 11) };

  it("detects a genuine clash", () => {
    expect(
      overlaps(base, {
        start: new Date(2026, 0, 1, 10, 30),
        end: new Date(2026, 0, 1, 11, 30),
      }),
    ).toBe(true);
  });

  it("allows back-to-back bookings that merely touch", () => {
    expect(
      overlaps(base, {
        start: new Date(2026, 0, 1, 11),
        end: new Date(2026, 0, 1, 12),
      }),
    ).toBe(false);
  });
});

describe("expandProtocol", () => {
  it("orders steps by day, then by treatment phase", () => {
    const sessions = expandProtocol(
      [
        step({ dayOffset: 1, phase: "PASCHATKARMA", procedureName: "Rest diet" }),
        step({ dayOffset: 0, phase: "PRADHANAKARMA", procedureName: "Virechana" }),
        step({ dayOffset: 0, phase: "PURVAKARMA", procedureName: "Snehana" }),
      ],
      MONDAY,
    );

    expect(sessions.map((s) => s.procedureName)).toEqual([
      "Snehana",
      "Virechana",
      "Rest diet",
    ]);
  });

  it("numbers days from 1 and dates them from the start date", () => {
    const [first, second] = expandProtocol(
      [step({ dayOffset: 0 }), step({ dayOffset: 2, procedureName: "B" })],
      MONDAY,
    );

    expect(first.dayNumber).toBe(1);
    expect(second.dayNumber).toBe(3);
    expect(second.date.getDate()).toBe(MONDAY.getDate() + 2);
  });
});

describe("isTherapistFree", () => {
  const interval = { start: atMinute(MONDAY, 9 * 60), end: atMinute(MONDAY, 10 * 60) };

  it("accepts a slot inside the roster", () => {
    expect(isTherapistFree(therapist(), interval, [])).toBe(true);
  });

  it("rejects a slot that runs past the end of the shift", () => {
    const late = {
      start: atMinute(MONDAY, 17 * 60 + 30),
      end: atMinute(MONDAY, 18 * 60 + 30),
    };
    expect(isTherapistFree(therapist(), late, [])).toBe(false);
  });

  it("rejects a day the therapist is not rostered", () => {
    const sunday = startOfDay(new Date(2026, 7, 16));
    const onSunday = {
      start: atMinute(sunday, 9 * 60),
      end: atMinute(sunday, 10 * 60),
    };
    expect(isTherapistFree(therapist(), onSunday, [])).toBe(false);
  });

  it("respects approved time off", () => {
    const t = therapist({
      timeOff: [{ start: atMinute(MONDAY, 8 * 60), end: atMinute(MONDAY, 12 * 60) }],
    });
    expect(isTherapistFree(t, interval, [])).toBe(false);
  });

  it("rejects a slot already booked for that therapist", () => {
    const booking: ExistingBooking = {
      therapistId: "t1",
      roomId: "r1",
      start: atMinute(MONDAY, 9 * 60),
      end: atMinute(MONDAY, 10 * 60),
    };
    expect(isTherapistFree(therapist(), interval, [booking])).toBe(false);
  });

  it("ignores a booking belonging to a different therapist", () => {
    const booking: ExistingBooking = {
      therapistId: "someone-else",
      roomId: "r1",
      start: atMinute(MONDAY, 9 * 60),
      end: atMinute(MONDAY, 10 * 60),
    };
    expect(isTherapistFree(therapist(), interval, [booking])).toBe(true);
  });
});

describe("schedulePlan", () => {
  it("places every session and assigns resources", () => {
    const result = schedulePlan({
      sessions: expandProtocol(
        [step({ dayOffset: 0 }), step({ dayOffset: 1 })],
        MONDAY,
      ),
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
    });

    expect(result.scheduled).toHaveLength(2);
    expect(result.unscheduled).toHaveLength(0);
    expect(result.scheduled[0].therapistId).toBe("t1");
    expect(result.scheduled[0].roomId).toBe("r1");
  });

  it("takes the earliest slot within opening hours", () => {
    const [session] = schedulePlan({
      sessions: expandProtocol([step()], MONDAY),
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
    }).scheduled;

    expect(session.scheduledStart.getHours()).toBe(8);
    expect(session.scheduledStart.getMinutes()).toBe(0);
  });

  it("never double-books the single therapist across a plan", () => {
    // Two sessions on the same day must not land on the same time.
    const result = schedulePlan({
      sessions: expandProtocol(
        [
          step({ dayOffset: 0, procedureName: "A" }),
          step({ dayOffset: 0, procedureName: "B", phase: "PRADHANAKARMA" }),
        ],
        MONDAY,
      ),
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
    });

    expect(result.scheduled).toHaveLength(2);
    const [a, b] = result.scheduled;
    expect(overlaps(
      { start: a.scheduledStart, end: a.scheduledEnd },
      { start: b.scheduledStart, end: b.scheduledEnd },
    )).toBe(false);
  });

  it("leaves the turnaround buffer between consecutive sessions", () => {
    const result = schedulePlan({
      sessions: expandProtocol(
        [
          step({ dayOffset: 0, procedureName: "A" }),
          step({ dayOffset: 0, procedureName: "B" }),
        ],
        MONDAY,
      ),
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
      options: { bufferMin: 15 },
    });

    const [a, b] = result.scheduled;
    const gapMin =
      (b.scheduledStart.getTime() - a.scheduledEnd.getTime()) / 60000;
    expect(gapMin).toBeGreaterThanOrEqual(15);
  });

  it("works around a pre-existing booking", () => {
    const result = schedulePlan({
      sessions: expandProtocol([step()], MONDAY),
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [
        {
          therapistId: "t1",
          roomId: "r1",
          start: atMinute(MONDAY, 8 * 60),
          end: atMinute(MONDAY, 9 * 60),
        },
      ],
    });

    expect(result.scheduled[0].scheduledStart.getHours()).toBe(9);
  });

  it("reports rest days separately instead of booking a room", () => {
    const result = schedulePlan({
      sessions: expandProtocol(
        [
          step({ dayOffset: 0 }),
          step({ dayOffset: 1, isRestDay: true, procedureName: "Rest" }),
        ],
        MONDAY,
      ),
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
    });

    expect(result.scheduled).toHaveLength(1);
    expect(result.restDays).toHaveLength(1);
    expect(result.restDays[0].procedureName).toBe("Rest");
  });

  it("explains why a session could not be placed", () => {
    const result = schedulePlan({
      sessions: expandProtocol([step()], MONDAY),
      therapyType: "BASTI", // nobody has this expertise
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
    });

    expect(result.scheduled).toHaveLength(0);
    expect(result.unscheduled[0].reason).toBe("NO_THERAPIST_WITH_EXPERTISE");
  });

  it("requires the room type the therapy actually needs", () => {
    // Swedana needs a steam chamber; only a therapy table is available.
    const result = schedulePlan({
      sessions: expandProtocol([step({ procedureName: "Swedana" })], MONDAY),
      therapyType: "SWEDANA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
    });

    expect(result.unscheduled[0].reason).toBe("NO_ROOM_AVAILABLE");
  });

  it("schedules Swedana once a steam chamber exists", () => {
    const result = schedulePlan({
      sessions: expandProtocol([step({ procedureName: "Swedana" })], MONDAY),
      therapyType: "SWEDANA",
      therapists: [therapist()],
      rooms: [table, steam],
      existingBookings: [],
    });

    expect(result.scheduled[0].roomId).toBe("r2");
  });

  it("skips days the clinic is closed", () => {
    const sunday = startOfDay(new Date(2026, 7, 16));
    const result = schedulePlan({
      sessions: expandProtocol([step()], sunday),
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
    });

    expect(result.unscheduled[0].reason).toBe("CLINIC_CLOSED");
  });

  it("spreads load across therapists when one is fully booked", () => {
    const busy: ExistingBooking[] = [];
    // Block t1 for the whole morning.
    for (let h = 8; h < 18; h++) {
      busy.push({
        therapistId: "t1",
        roomId: null,
        start: atMinute(MONDAY, h * 60),
        end: atMinute(MONDAY, (h + 1) * 60),
      });
    }

    const result = schedulePlan({
      sessions: expandProtocol([step()], MONDAY),
      therapyType: "ABHYANGA",
      therapists: [therapist(), therapist({ id: "t2", name: "Ravi" })],
      rooms: [table],
      existingBookings: busy,
    });

    expect(result.scheduled[0].therapistId).toBe("t2");
  });
});

describe("findAlternativeSlots", () => {
  it("offers distinct options across upcoming days", () => {
    const [session] = expandProtocol([step()], MONDAY);

    const slots = findAlternativeSlots({
      session,
      therapyType: "ABHYANGA",
      therapists: [therapist()],
      rooms: [table],
      existingBookings: [],
      searchDays: 5,
      maxResults: 3,
    });

    expect(slots).toHaveLength(3);
    const times = slots.map((s) => s.scheduledStart.getTime());
    expect(new Set(times).size).toBe(3);
  });
});

describe("checkContraindications", () => {
  it("blocks Vamana for a cardiac patient", () => {
    const findings = checkContraindications("VAMANA", {
      age: 45,
      conditions: ["Hypertension", "Type 2 diabetes"],
    });

    expect(findings.some((f) => f.severity === "ABSOLUTE")).toBe(true);
  });

  it("blocks purgation therapies in pregnancy", () => {
    const findings = checkContraindications("VIRECHANA", {
      age: 30,
      isPregnant: true,
      conditions: [],
    });

    expect(findings[0].severity).toBe("ABSOLUTE");
  });

  it("passes a straightforward Abhyanga case cleanly", () => {
    const findings = checkContraindications("ABHYANGA", {
      age: 35,
      conditions: [],
    });

    expect(findings).toHaveLength(0);
  });

  it("raises a relative caution for an elderly patient", () => {
    const findings = checkContraindications("ABHYANGA", {
      age: 78,
      conditions: [],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("RELATIVE");
  });

  it("warns about burn risk for Swedana in diabetes", () => {
    const findings = checkContraindications("SWEDANA", {
      age: 50,
      conditions: ["Diabetes mellitus"],
    });

    expect(findings.some((f) => f.message.includes("burn risk"))).toBe(true);
  });
});
