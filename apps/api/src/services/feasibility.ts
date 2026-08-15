import type { FeasibilityFailure, FeasibilityResult, SearchRequest } from "@thr/shared";

export interface HotelSnapshot {
  id: string;
  name: string;
  validFrom: Date;
  validTo: Date;
  blackoutDates: string[];
  minStayNights: number;
  roomMaxOccupancy: number;
  childFreeUntil: number;
  childRateTo: number;
}

export interface VehicleSnapshot {
  id: string;
  seatingCapacity: number;
}

export interface ActivitySnapshot {
  id: string;
  name: string;
  operatingDays: number[];
  dayNumber: number;
}

export function validateSearch(req: SearchRequest): FeasibilityFailure[] {
  const failures: FeasibilityFailure[] = [];
  if (req.adults < 1) {
    failures.push({ check: "VALIDATION", message: "At least one adult is required." });
  }
  if (req.rooms < 1) {
    failures.push({ check: "VALIDATION", message: "At least one room is required." });
  }
  if (req.nights !== 0 && (req.nights < 1 || req.nights > 21)) {
    failures.push({ check: "VALIDATION", message: "Nights must be between 1 and 21, or 0 to list all test packages." });
  }
  if (req.children !== req.childAges.length) {
    failures.push({
      check: "VALIDATION",
      message: "childAges length must equal children count.",
      details: { children: req.children, childAges: req.childAges },
    });
  }
  if (req.adults + req.children > req.rooms * 4) {
    failures.push({
      check: "VALIDATION",
      message: "Pax exceed maximum occupancy assumption of 4 per room. Reduce pax or increase rooms.",
      details: { pax: req.adults + req.children, rooms: req.rooms },
    });
  }
  const start = new Date(`${req.travelDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    failures.push({ check: "VALIDATION", message: `travelDate is not a valid ISO date: ${req.travelDate}` });
  }
  return failures;
}

export function checkHotelFeasibility(
  hotel: HotelSnapshot,
  travelDate: string,
  nights: number,
  adults: number,
  children: number,
  rooms: number,
  childAges: number[],
): FeasibilityFailure[] {
  const failures: FeasibilityFailure[] = [];
  const start = new Date(`${travelDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + nights);
  if (start < hotel.validFrom || end > hotel.validTo) {
    failures.push({
      check: "HOTEL_AVAILABILITY",
      message: `${hotel.name} is not contracted for the requested dates.`,
      details: { hotelId: hotel.id, validFrom: hotel.validFrom, validTo: hotel.validTo },
    });
  }
  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (hotel.blackoutDates.includes(iso)) {
      failures.push({
        check: "BLACKOUT_DATES",
        message: `${hotel.name} is blacked out on ${iso}.`,
        details: { hotelId: hotel.id, date: iso },
      });
    }
  }
  if (nights < hotel.minStayNights) {
    failures.push({
      check: "MINIMUM_STAY",
      message: `${hotel.name} requires a minimum stay of ${hotel.minStayNights} nights.`,
      details: { hotelId: hotel.id, minStayNights: hotel.minStayNights },
    });
  }
  if (adults + children > rooms * hotel.roomMaxOccupancy) {
    failures.push({
      check: "HOTEL_AVAILABILITY",
      message: `Selected room type at ${hotel.name} cannot sleep ${adults + children} pax in ${rooms} room(s).`,
      details: { maxOccupancy: hotel.roomMaxOccupancy, rooms },
    });
  }
  for (const age of childAges) {
    if (age > hotel.childRateTo && age < 18) {
      failures.push({
        check: "CHILD_POLICY",
        message: `Child aged ${age} is treated as an adult under ${hotel.name} child policy (child rate only to age ${hotel.childRateTo}).`,
        details: { hotelId: hotel.id, age },
      });
    }
  }
  return failures;
}

export function checkVehicleFeasibility(vehicle: VehicleSnapshot, pax: number): FeasibilityFailure[] {
  if (pax > vehicle.seatingCapacity) {
    return [
      {
        check: "TRANSFER_AVAILABILITY",
        message: `Selected vehicle seats ${vehicle.seatingCapacity}; party size is ${pax}.`,
        details: { vehicleId: vehicle.id },
      },
    ];
  }
  return [];
}

export function checkActivityFeasibility(
  activity: ActivitySnapshot,
  travelDate: string,
): FeasibilityFailure[] {
  const start = new Date(`${travelDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + (activity.dayNumber - 1));
  const dow = start.getUTCDay();
  if (!activity.operatingDays.includes(dow)) {
    return [
      {
        check: "ACTIVITY_AVAILABILITY",
        message: `${activity.name} does not operate on the scheduled weekday.`,
        details: { activityId: activity.id, weekday: dow },
      },
    ];
  }
  return [];
}

export function combineFeasibility(groups: FeasibilityFailure[][]): FeasibilityResult {
  const failures = groups.flat();
  return { feasible: failures.length === 0, failures };
}
