import { prisma } from "@thr/db";
import { pricePackage, type MarkupRuleInput, type TaxRuleInput } from "@thr/pricing";
import type { PackageState, PricedPackage, SearchRequest, TaxStackStep } from "@thr/shared";
import { getAdapter } from "@thr/vendors";
import { nanoid } from "nanoid";
import { ApiError, validationError } from "../errors.js";
import { cacheGet, cacheSet } from "../cache.js";
import {
  checkActivityFeasibility,
  checkHotelFeasibility,
  checkVehicleFeasibility,
  combineFeasibility,
  validateSearch,
} from "./feasibility.js";
import { isoDate, nightsBetween, parseIsoDate, resolveNightRate } from "./rates.js";
import { getSetting } from "./settings.js";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function searchPackages(req: SearchRequest, agent?: { id: string; agentGroupId?: string | null; customerSegmentId?: string | null; commissionBps: number }): Promise<PricedPackage[]> {
  const v = validateSearch(req);
  if (v.length) throw validationError(v[0]!.message, v);

  const templates = await prisma.itineraryTemplate.findMany({
    where: {
      destinationId: req.destinationId,
      ...(req.nights > 0 ? { nightCount: req.nights } : {}),
    },
    include: { slots: true, destination: true },
    orderBy: { nightCount: "asc" },
  });
  if (!templates.length) {
    throw new ApiError(404, "No itinerary template matches this destination and night count. Day-wise structure is fixed per template.", "NO_TEMPLATE");
  }

  const results: PricedPackage[] = [];
  for (const tpl of templates) {
    const priced = await instantiateAndPrice(tpl.id, req, agent);
    results.push(priced);
  }
  return results;
}

export async function instantiateAndPrice(
  templateId: string,
  req: SearchRequest,
  agent?: { id: string; agentGroupId?: string | null; customerSegmentId?: string | null; commissionBps: number },
  overrides?: Partial<PackageState>,
): Promise<PricedPackage> {
  const tpl = await prisma.itineraryTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { slots: true, destination: true },
  });

  const hotelSlots = tpl.slots.filter((s) => s.slotType === "HOTEL_NIGHT").sort((a, b) => a.dayNumber - b.dayNumber);
  const activitySlots = tpl.slots.filter((s) => s.slotType === "ACTIVITY_SLOT");

  const defaultHotelId = overrides?.hotels?.[0]?.hotelId ?? hotelSlots[0]?.defaultHotelId;
  if (!defaultHotelId) throw new ApiError(422, "Template is missing a default hotel.", "TEMPLATE_INCOMPLETE");

  const vehicle =
    (overrides?.vehicleId
      ? await prisma.vehicle.findUnique({ where: { id: overrides.vehicleId } })
      : await prisma.vehicle.findFirst({
          where: { destinationId: tpl.destinationId },
          orderBy: { seatingCapacity: "desc" },
        })) ?? null;
  if (!vehicle) throw new ApiError(422, "No vehicle contracted for this destination.", "NO_VEHICLE");

  const nights = tpl.nightCount;
  const start = parseIsoDate(req.travelDate);
  const nightDates = nightsBetween(start, nights);

  const hotels = await Promise.all(
    hotelSlots.map(async (slot, i) => {
      const hotelId = overrides?.hotels?.[i]?.hotelId ?? slot.defaultHotelId ?? defaultHotelId;
      const roomTypeId =
        overrides?.hotels?.[i]?.roomTypeId ??
        slot.defaultRoomTypeId ??
        (
          await prisma.roomType.findFirstOrThrow({
            where: { hotelId },
            orderBy: { name: "asc" },
          })
        ).id;
      const room = await prisma.roomType.findUniqueOrThrow({ where: { id: roomTypeId } });
      return {
        nightIndex: i,
        date: isoDate(nightDates[i]!),
        hotelId,
        roomTypeId,
        mealPlan: overrides?.hotels?.[i]?.mealPlan ?? room.mealPlan,
      };
    }),
  );

  const activities = await Promise.all(
    activitySlots.map(async (slot) => {
      const existing = overrides?.activities?.find((a) => a.dayNumber === slot.dayNumber);
      if (existing) return existing;
      if (!slot.defaultActivityId || !slot.defaultActivityOptionId) return null;
      const opt = await prisma.activityOption.findUniqueOrThrow({ where: { id: slot.defaultActivityOptionId } });
      return {
        dayNumber: slot.dayNumber,
        activityId: slot.defaultActivityId,
        optionId: slot.defaultActivityOptionId,
        transferType: opt.transferType,
      };
    }),
  );

  const state: PackageState = {
    id: overrides?.id ?? nanoid(),
    templateId: tpl.id,
    destinationId: tpl.destinationId,
    travelDate: req.travelDate,
    nights,
    adults: req.adults,
    children: req.children,
    childAges: req.childAges,
    rooms: req.rooms,
    nationality: req.nationality,
    displayCurrency: req.currency,
    hotels,
    vehicleId: vehicle.id,
    activities: activities.filter((a): a is NonNullable<typeof a> => a != null),
    visaMinor: overrides?.visaMinor ?? 0,
    insuranceMinor: overrides?.insuranceMinor ?? 0,
    guideMinor: overrides?.guideMinor ?? 0,
    serviceChargeMinor: overrides?.serviceChargeMinor ?? 0,
    agentId: agent?.id,
    agentGroupId: agent?.agentGroupId ?? undefined,
    customerSegmentId: agent?.customerSegmentId ?? undefined,
  };

  return priceState(state, agent?.commissionBps ?? 0);
}

export async function priceState(state: PackageState, commissionBps: number): Promise<PricedPackage> {
  const cacheKey = `pkg:${JSON.stringify(state)}:${commissionBps}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached) as PricedPackage;

  const tpl = await prisma.itineraryTemplate.findUniqueOrThrow({ where: { id: state.templateId } });
  const uniqueHotelIds = [...new Set(state.hotels.map((h) => h.hotelId))];
  const hotels = await prisma.hotel.findMany({
    where: { id: { in: uniqueHotelIds } },
    include: { childPolicy: true, cancellationPolicy: true, roomTypes: { include: { rates: { include: { seasonalRule: true } } } } },
  });

  const failures = [];
  failures.push(...validateSearch({
    destinationId: state.destinationId,
    travelDate: state.travelDate,
    nights: state.nights,
    adults: state.adults,
    children: state.children,
    childAges: state.childAges,
    rooms: state.rooms,
    nationality: state.nationality,
    currency: state.displayCurrency,
  }));

  let hotelMinor = 0;
  const hotelVendor = getAdapter("hotel", await getSetting("HOTEL_VENDOR"));
  for (const night of state.hotels) {
    const hotel = hotels.find((h) => h.id === night.hotelId);
    if (!hotel) {
      failures.push({ check: "HOTEL_AVAILABILITY" as const, message: `Hotel ${night.hotelId} not found.` });
      continue;
    }
    const room = hotel.roomTypes.find((r) => r.id === night.roomTypeId);
    if (!room) {
      failures.push({ check: "HOTEL_AVAILABILITY" as const, message: `Room type ${night.roomTypeId} not found.` });
      continue;
    }
    const consecutive = state.hotels.filter((h) => h.hotelId === hotel.id).length;
    failures.push(
      ...checkHotelFeasibility(
        {
          id: hotel.id,
          name: hotel.name,
          validFrom: hotel.validFrom,
          validTo: hotel.validTo,
          blackoutDates: asStringArray(hotel.blackoutDates),
          minStayNights: hotel.minStayNights,
          roomMaxOccupancy: room.maxOccupancy,
          childFreeUntil: hotel.childPolicy?.freeUntilAge ?? 5,
          childRateTo: hotel.childPolicy?.childRateTo ?? 11,
        },
        night.date,
        consecutive,
        state.adults,
        state.children,
        state.rooms,
        state.childAges,
      ),
    );
    const apiCode = hotel.apiHotelCode;
    const api = apiCode
      ? await hotelVendor.getRate(apiCode, {
          destinationCity: "",
          checkIn: night.date,
          checkOut: night.date,
          adults: state.adults,
          children: state.children,
          rooms: state.rooms,
        })
      : null;
    const resolved = resolveNightRate(
      room.rates.map((r) => ({
        source: r.source,
        priceMinor: r.priceMinor,
        validFrom: r.validFrom,
        validTo: r.validTo,
        seasonalMultiplier: r.seasonalRule ? Number(r.seasonalRule.multiplier) : 1,
        seasonalFrom: r.seasonalRule?.validFrom,
        seasonalTo: r.seasonalRule?.validTo,
      })),
      parseIsoDate(night.date),
      api,
    );
    if (!resolved) {
      failures.push({
        check: "SEASONAL_PRICING" as const,
        message: `No rate for ${hotel.name} / ${room.name} on ${night.date}.`,
      });
      continue;
    }
    hotelMinor += resolved.amountMinor * state.rooms;
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: state.vehicleId }, include: { rates: { include: { seasonalRule: true } } } });
  if (!vehicle) {
    failures.push({ check: "TRANSFER_AVAILABILITY" as const, message: "Vehicle not found." });
  } else {
    failures.push(...checkVehicleFeasibility(vehicle, state.adults + state.children));
  }
  const vRate = vehicle?.rates.find((r) => parseIsoDate(state.travelDate) >= r.validFrom && parseIsoDate(state.travelDate) <= r.validTo);
  const seasonal = vRate?.seasonalRule && parseIsoDate(state.travelDate) >= vRate.seasonalRule.validFrom && parseIsoDate(state.travelDate) <= vRate.seasonalRule.validTo
    ? Number(vRate.seasonalRule.multiplier)
    : 1;
  const vehicleMinor = vRate
    ? Math.round((vRate.airportTransferMinor + vRate.privateRateMinor + vRate.driverChargeMinor + vRate.tollMinor + vRate.fuelSurchargeMinor) * seasonal)
    : 0;
  if (vehicle && !vRate) {
    failures.push({ check: "SEASONAL_PRICING" as const, message: "No vehicle rate for travel dates." });
  }

  let activityMinor = 0;
  for (const sel of state.activities) {
    const opt = await prisma.activityOption.findUnique({
      where: { id: sel.optionId },
      include: { activity: true },
    });
    if (!opt) {
      failures.push({ check: "ACTIVITY_AVAILABILITY" as const, message: `Activity option ${sel.optionId} not found.` });
      continue;
    }
    failures.push(
      ...checkActivityFeasibility(
        {
          id: opt.activity.id,
          name: opt.activity.name,
          operatingDays: opt.activity.operatingDays,
          dayNumber: sel.dayNumber,
        },
        state.travelDate,
      ),
    );
    const childChargeable = state.childAges.filter((a) => a > 5).length;
    activityMinor += opt.adultRateMinor * state.adults + opt.childRateMinor * childChargeable;
  }

  const markupRows = await prisma.markupRule.findMany({ where: { enabled: true } });
  const taxRows = await prisma.taxRule.findMany({ where: { enabled: true } });
  const fx = await prisma.fxRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: "INR", toCurrency: state.displayCurrency } },
  });
  const stacking = (await getSetting("TAX_STACKING_ORDER")).split(",") as TaxStackStep[];
  const primaryHotel = hotels[0];

  const markupRules: MarkupRuleInput[] = markupRows.map((r) => ({
    id: r.id,
    name: r.name,
    scope: r.scope,
    type: r.type,
    value: r.value,
    destinationId: r.destinationId,
    hotelCategory: r.hotelCategory,
    costBandMinMinor: r.costBandMinMinor,
    costBandMaxMinor: r.costBandMaxMinor,
    agentGroupId: r.agentGroupId,
    customerSegmentId: r.customerSegmentId,
    supplierId: r.supplierId,
    productType: r.productType,
    validFrom: r.validFrom,
    validTo: r.validTo,
    priority: r.priority,
    enabled: r.enabled,
    exclusive: r.exclusive,
    createdAt: r.createdAt,
  }));
  const taxRules: TaxRuleInput[] = taxRows.map((t) => ({
    type: t.type,
    rateBps: t.rateBps,
    enabled: t.enabled,
    nationalityIn: t.nationalityIn,
    minTaxableMinor: t.minTaxableMinor,
  }));

  const price = pricePackage({
    costs: {
      hotelMinor,
      vehicleMinor,
      activityMinor,
      visaMinor: state.visaMinor,
      insuranceMinor: state.insuranceMinor,
      guideMinor: state.guideMinor,
      serviceChargeMinor: state.serviceChargeMinor,
    },
    markupRules,
    taxRules,
    commissionBps,
    nationality: state.nationality,
    destinationId: state.destinationId,
    hotelCategory: primaryHotel?.category,
    agentGroupId: state.agentGroupId,
    customerSegmentId: state.customerSegmentId,
    supplierIds: [...new Set(hotels.map((h) => h.supplierId).concat(vehicle ? [vehicle.supplierId] : []))],
    asOf: parseIsoDate(state.travelDate),
    canonicalCurrency: "INR",
    displayCurrency: state.displayCurrency,
    fxRateE6: fx?.rateE6 ?? 1_000_000,
    stackingOrder: stacking,
  });

  const cancel = primaryHotel?.cancellationPolicy?.description ?? "See hotel policy.";
  const priced: PricedPackage = {
    package: state,
    templateName: tpl.name,
    price,
    feasibility: combineFeasibility([failures]),
    inclusions: asStringArray(tpl.inclusions),
    exclusions: asStringArray(tpl.exclusions),
    cancellationSummary: cancel,
  };

  await cacheSet(cacheKey, JSON.stringify(priced), 60);
  return priced;
}

export async function persistPackage(priced: PricedPackage, agentId?: string): Promise<string> {
  const row = await prisma.package.upsert({
    where: { id: priced.package.id },
    create: {
      id: priced.package.id,
      templateId: priced.package.templateId,
      destinationId: priced.package.destinationId,
      travelDate: parseIsoDate(priced.package.travelDate),
      nights: priced.package.nights,
      adults: priced.package.adults,
      children: priced.package.children,
      childAges: priced.package.childAges,
      rooms: priced.package.rooms,
      nationality: priced.package.nationality,
      displayCurrency: priced.package.displayCurrency,
      stateJson: priced.package as object,
      priceJson: priced.price as object,
      agentId,
    },
    update: {
      stateJson: priced.package as object,
      priceJson: priced.price as object,
    },
  });
  return row.id;
}
