import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const YEAR_START = new Date("2026-01-01T00:00:00.000Z");
const YEAR_END = new Date("2027-12-31T23:59:59.000Z");

async function main() {
  await prisma.booking.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.package.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.hotelRate.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.vehicleRate.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.activityOption.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.itinerarySlot.deleteMany();
  await prisma.itineraryTemplate.deleteMany();
  await prisma.seasonalRule.deleteMany();
  await prisma.markupRule.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.agentGroup.deleteMany();
  await prisma.customerSegment.deleteMany();
  await prisma.childPolicy.deleteMany();
  await prisma.cancellationPolicy.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.destination.deleteMany();

  const goa = await prisma.destination.create({
    data: {
      country: "India",
      city: "Goa",
      countryCode: "IN",
      airports: [{ code: "GOI", name: "Goa International (Dabolim)" }],
      attractions: ["Baga Beach", "Old Goa churches", "Dudhsagar Falls"],
      mapsUrl: "https://maps.google.com/?q=Goa",
      weather: "Tropical; 24–33°C",
      bestSeason: "November–March",
      visaInfo: "Indian nationals: none. Others: e-Visa / visa as applicable.",
    },
  });

  const dubai = await prisma.destination.create({
    data: {
      country: "United Arab Emirates",
      city: "Dubai",
      countryCode: "AE",
      airports: [{ code: "DXB", name: "Dubai International" }],
      attractions: ["Burj Khalifa", "Desert safari", "Dubai Mall"],
      mapsUrl: "https://maps.google.com/?q=Dubai",
      weather: "Desert; 18–41°C",
      bestSeason: "November–March",
      visaInfo: "UAE visa / visa on arrival by nationality. Cost line item only.",
    },
  });

  const hotelSupplier = await prisma.supplier.create({
    data: {
      name: "Coastal Stays DMC",
      type: "HOTEL",
      contactEmail: "contracting@coastal.example",
      commercialTermsRef: "CTR-HTL-2026-01",
    },
  });
  const vehicleSupplier = await prisma.supplier.create({
    data: {
      name: "HolidayTaxis Mock Fleet",
      type: "VEHICLE",
      contactEmail: "ops@htx.example",
      commercialTermsRef: "CTR-VEH-2026-01",
    },
  });
  const activitySupplier = await prisma.supplier.create({
    data: {
      name: "Viator-shaped Experiences",
      type: "ACTIVITY",
      contactEmail: "partners@experiences.example",
      commercialTermsRef: "CTR-ACT-2026-01",
    },
  });

  const childPolicy = await prisma.childPolicy.create({
    data: {
      name: "Standard child (0–5 free, 6–11 child rate)",
      freeUntilAge: 5,
      childRateFrom: 6,
      childRateTo: 11,
      extraBedAllowed: true,
    },
  });

  const cancelPolicy = await prisma.cancellationPolicy.create({
    data: {
      name: "Free cancel 7 days / 50% 3 days / no-show 100%",
      description: "Standard leisure cancellation ladder.",
      rulesJson: [
        { daysBefore: 7, penaltyPercent: 0 },
        { daysBefore: 3, penaltyPercent: 50 },
        { daysBefore: 0, penaltyPercent: 100 },
      ],
    },
  });

  const peak = await prisma.seasonalRule.create({
    data: {
      name: "Peak winter 2026",
      validFrom: new Date("2026-12-15T00:00:00.000Z"),
      validTo: new Date("2027-01-10T00:00:00.000Z"),
      multiplier: 1.25,
    },
  });

  async function hotel(opts: {
    name: string;
    dest: string;
    category: string;
    stars: number;
    tags: string[];
    distance: number;
    review: number;
    minStay?: number;
    blackouts?: string[];
    rooms: { name: string; occ: number; meal: "EP" | "CP" | "MAP" | "AP"; staticMinor: number; apiMinor?: number }[];
  }) {
    const h = await prisma.hotel.create({
      data: {
        name: opts.name,
        destinationId: opts.dest,
        category: opts.category,
        starRating: opts.stars,
        validFrom: YEAR_START,
        validTo: YEAR_END,
        blackoutDates: opts.blackouts ?? [],
        supplierId: hotelSupplier.id,
        priorityRanking: 100 - opts.stars * 5,
        reviewScore: opts.review,
        distanceFromCityKm: opts.distance,
        tags: opts.tags,
        images: [`https://picsum.photos/seed/${encodeURIComponent(opts.name)}/800/500`],
        minStayNights: opts.minStay ?? 1,
        childPolicyId: childPolicy.id,
        cancellationPolicyId: cancelPolicy.id,
        apiHotelCode: `HB-${opts.name.slice(0, 8).toUpperCase().replace(/\s/g, "")}`,
      },
    });
    for (const r of opts.rooms) {
      const rt = await prisma.roomType.create({
        data: {
          hotelId: h.id,
          name: r.name,
          sizeSqm: 28,
          maxOccupancy: r.occ,
          mealPlan: r.meal,
        },
      });
      await prisma.hotelRate.create({
        data: {
          roomTypeId: rt.id,
          source: "STATIC",
          currency: "INR",
          priceMinor: r.staticMinor,
          validFrom: YEAR_START,
          validTo: YEAR_END,
          seasonalRuleId: peak.id,
        },
      });
      if (r.apiMinor != null) {
        await prisma.hotelRate.create({
          data: {
            roomTypeId: rt.id,
            source: "API",
            currency: "INR",
            priceMinor: r.apiMinor,
            validFrom: YEAR_START,
            validTo: YEAR_END,
          },
        });
      }
    }
    return h;
  }

  const taj = await hotel({
    name: "Taj Fort Aguada Resort",
    dest: goa.id,
    category: "luxury",
    stars: 5,
    tags: ["beachfront", "honeymoon", "luxury"],
    distance: 12,
    review: 9.1,
    rooms: [
      { name: "Deluxe Sea View", occ: 3, meal: "CP", staticMinor: 1850000, apiMinor: 1790000 },
      { name: "Suite MAP", occ: 3, meal: "MAP", staticMinor: 2400000 },
    ],
  });
  const tajDeluxe = await prisma.roomType.findFirstOrThrow({ where: { hotelId: taj.id, name: "Deluxe Sea View" } });

  const novotel = await hotel({
    name: "Novotel Goa Candolim",
    dest: goa.id,
    category: "upscale",
    stars: 4,
    tags: ["family", "beachfront"],
    distance: 4,
    review: 8.4,
    rooms: [{ name: "Superior Twin", occ: 3, meal: "CP", staticMinor: 980000, apiMinor: 1020000 }],
  });
  const novotelRoom = await prisma.roomType.findFirstOrThrow({ where: { hotelId: novotel.id } });

  await hotel({
    name: "Holiday Inn Goa Candolim",
    dest: goa.id,
    category: "midscale",
    stars: 3,
    tags: ["family"],
    distance: 3.5,
    review: 7.9,
    minStay: 2,
    rooms: [{ name: "Standard", occ: 3, meal: "EP", staticMinor: 620000 }],
  });

  await hotel({
    name: "Alila Diwa Goa",
    dest: goa.id,
    category: "luxury",
    stars: 5,
    tags: ["luxury", "honeymoon"],
    distance: 18,
    review: 8.9,
    blackouts: ["2026-12-24", "2026-12-25", "2026-12-31"],
    rooms: [{ name: "Garden Villa", occ: 3, meal: "MAP", staticMinor: 2100000 }],
  });

  const atlantis = await hotel({
    name: "Atlantis The Palm",
    dest: dubai.id,
    category: "luxury",
    stars: 5,
    tags: ["luxury", "family", "honeymoon"],
    distance: 22,
    review: 9.0,
    rooms: [{ name: "Palm View King", occ: 3, meal: "CP", staticMinor: 3200000, apiMinor: 3050000 }],
  });
  const atlantisRoom = await prisma.roomType.findFirstOrThrow({ where: { hotelId: atlantis.id } });

  await hotel({
    name: "Rove Downtown",
    dest: dubai.id,
    category: "midscale",
    stars: 3,
    tags: ["city-center", "family"],
    distance: 1.2,
    review: 8.2,
    rooms: [{ name: "Rove Room", occ: 3, meal: "CP", staticMinor: 1100000 }],
  });

  async function vehicle(opts: {
    name: string;
    dest: string;
    type: "SEDAN" | "SUV" | "PREMIUM_SUV_INNOVA" | "LUXURY" | "VAN" | "MINI_COACH" | "COACH";
    seats: number;
    city: string;
    airport: number;
    sic: number;
    priv: number;
  }) {
    const v = await prisma.vehicle.create({
      data: {
        name: opts.name,
        type: opts.type,
        seatingCapacity: opts.seats,
        supplierId: vehicleSupplier.id,
        destinationId: opts.dest,
        city: opts.city,
        route: "Airport – Hotel – City",
      },
    });
    await prisma.vehicleRate.create({
      data: {
        vehicleId: v.id,
        airportTransferMinor: opts.airport,
        sicRateMinor: opts.sic,
        privateRateMinor: opts.priv,
        extraHourMinor: 45000,
        driverChargeMinor: 80000,
        tollMinor: 25000,
        parkingMinor: 15000,
        fuelSurchargeMinor: 20000,
        nightChargeMinor: 35000,
        validFrom: YEAR_START,
        validTo: YEAR_END,
        seasonalRuleId: peak.id,
      },
    });
    return v;
  }

  const goaInnova = await vehicle({
    name: "Toyota Innova Crysta",
    dest: goa.id,
    type: "PREMIUM_SUV_INNOVA",
    seats: 6,
    city: "Goa",
    airport: 280000,
    sic: 90000,
    priv: 420000,
  });
  await vehicle({
    name: "Sedan Dzire",
    dest: goa.id,
    type: "SEDAN",
    seats: 3,
    city: "Goa",
    airport: 160000,
    sic: 60000,
    priv: 240000,
  });
  const dubaiSuv = await vehicle({
    name: "Toyota Fortuner",
    dest: dubai.id,
    type: "SUV",
    seats: 6,
    city: "Dubai",
    airport: 450000,
    sic: 120000,
    priv: 680000,
  });

  async function activity(opts: {
    name: string;
    dest: string;
    desc: string;
    minutes: number;
    category: string;
    time: string;
    adult: number;
    child: number;
  }) {
    const a = await prisma.activity.create({
      data: {
        name: opts.name,
        description: opts.desc,
        destinationId: opts.dest,
        durationMinutes: opts.minutes,
        recommendedTime: opts.time,
        category: opts.category,
        supplierId: activitySupplier.id,
        images: [`https://picsum.photos/seed/${encodeURIComponent(opts.name)}/800/500`],
        apiActivityCode: `VIA-${opts.name.slice(0, 6).toUpperCase().replace(/\s/g, "")}`,
      },
    });
    const none = await prisma.activityOption.create({
      data: {
        activityId: a.id,
        name: "Without transfer",
        transferIncluded: false,
        transferType: "NONE",
        adultRateMinor: opts.adult,
        childRateMinor: opts.child,
        seniorRateMinor: Math.round(opts.adult * 0.9),
        cancellationRules: "Free cancel 24h before.",
      },
    });
    const sic = await prisma.activityOption.create({
      data: {
        activityId: a.id,
        name: "SIC transfer",
        transferIncluded: true,
        transferType: "SIC",
        pickupTime: "08:00",
        adultRateMinor: opts.adult + 35000,
        childRateMinor: opts.child + 20000,
        seniorRateMinor: Math.round(opts.adult * 0.9) + 35000,
      },
    });
    const priv = await prisma.activityOption.create({
      data: {
        activityId: a.id,
        name: "Private transfer",
        transferIncluded: true,
        transferType: "PRIVATE",
        pickupTime: "flexible",
        adultRateMinor: opts.adult + 120000,
        childRateMinor: opts.child + 80000,
        seniorRateMinor: Math.round(opts.adult * 0.9) + 120000,
      },
    });
    return { a, none, sic, priv };
  }

  const cruise = await activity({
    name: "Mandovi River Cruise",
    dest: goa.id,
    desc: "Evening cruise with folk performances.",
    minutes: 180,
    category: "sightseeing",
    time: "evening",
    adult: 180000,
    child: 90000,
  });
  const dudhsagar = await activity({
    name: "Dudhsagar Falls day trip",
    dest: goa.id,
    desc: "Jeep safari to the falls with lunch.",
    minutes: 480,
    category: "adventure",
    time: "morning",
    adult: 320000,
    child: 180000,
  });
  const desert = await activity({
    name: "Desert safari with BBQ",
    dest: dubai.id,
    desc: "Dune bashing, camel ride, dinner show.",
    minutes: 360,
    category: "adventure",
    time: "afternoon",
    adult: 450000,
    child: 250000,
  });

  const goaTpl = await prisma.itineraryTemplate.create({
    data: {
      name: "Goa Classic 3N/4D",
      destinationId: goa.id,
      dayCount: 4,
      nightCount: 3,
      minStayNights: 3,
      inclusions: ["Airport transfers", "Daily breakfast (if CP+)", "Selected activities"],
      exclusions: ["Flights", "Personal expenses", "Travel insurance issuance"],
      slots: {
        create: [
          { dayNumber: 1, slotType: "TRANSFER_SLOT", sequence: 1 },
          { dayNumber: 1, slotType: "HOTEL_NIGHT", sequence: 2, defaultHotelId: taj.id, defaultRoomTypeId: tajDeluxe.id },
          { dayNumber: 2, slotType: "ACTIVITY_SLOT", sequence: 1, defaultActivityId: cruise.a.id, defaultActivityOptionId: cruise.sic.id },
          { dayNumber: 2, slotType: "HOTEL_NIGHT", sequence: 2, defaultHotelId: taj.id, defaultRoomTypeId: tajDeluxe.id },
          { dayNumber: 3, slotType: "ACTIVITY_SLOT", sequence: 1, defaultActivityId: dudhsagar.a.id, defaultActivityOptionId: dudhsagar.none.id },
          { dayNumber: 3, slotType: "HOTEL_NIGHT", sequence: 2, defaultHotelId: taj.id, defaultRoomTypeId: tajDeluxe.id },
          { dayNumber: 4, slotType: "TRANSFER_SLOT", sequence: 1 },
        ],
      },
    },
  });

  await prisma.itineraryTemplate.create({
    data: {
      name: "Dubai Highlights 4N/5D",
      destinationId: dubai.id,
      dayCount: 5,
      nightCount: 4,
      minStayNights: 4,
      inclusions: ["Airport transfers", "Desert safari"],
      exclusions: ["Flights", "UAE visa issuance"],
      slots: {
        create: [
          { dayNumber: 1, slotType: "TRANSFER_SLOT", sequence: 1 },
          { dayNumber: 1, slotType: "HOTEL_NIGHT", sequence: 2, defaultHotelId: atlantis.id, defaultRoomTypeId: atlantisRoom.id },
          { dayNumber: 2, slotType: "HOTEL_NIGHT", sequence: 2, defaultHotelId: atlantis.id, defaultRoomTypeId: atlantisRoom.id },
          { dayNumber: 3, slotType: "ACTIVITY_SLOT", sequence: 1, defaultActivityId: desert.a.id, defaultActivityOptionId: desert.priv.id },
          { dayNumber: 3, slotType: "HOTEL_NIGHT", sequence: 2, defaultHotelId: atlantis.id, defaultRoomTypeId: atlantisRoom.id },
          { dayNumber: 4, slotType: "HOTEL_NIGHT", sequence: 2, defaultHotelId: atlantis.id, defaultRoomTypeId: atlantisRoom.id },
          { dayNumber: 5, slotType: "TRANSFER_SLOT", sequence: 1 },
        ],
      },
    },
  });

  const retail = await prisma.agentGroup.create({ data: { name: "Retail India" } });
  const wholesale = await prisma.agentGroup.create({ data: { name: "Wholesale GCC" } });
  const leisure = await prisma.customerSegment.create({ data: { name: "Leisure FIT" } });
  const honeymoon = await prisma.customerSegment.create({ data: { name: "Honeymoon" } });

  const passwordHash = await hash("Password123!", 10);
  const users: Array<{ email: string; name: string; role: "AGENT" | "CONTRACTING_ADMIN" | "REVENUE_ADMIN" | "SUPPORT" | "FINANCE_READONLY"; group?: string; seg?: string }> = [
    { email: "agent@thr.com", name: "Asha Agent", role: "AGENT", group: retail.id, seg: leisure.id },
    { email: "contracting@thr.com", name: "Kiran Contracting", role: "CONTRACTING_ADMIN" },
    { email: "revenue@thr.com", name: "Ravi Revenue", role: "REVENUE_ADMIN" },
    { email: "support@thr.com", name: "Sam Support", role: "SUPPORT" },
    { email: "finance@thr.com", name: "Fara Finance", role: "FINANCE_READONLY" },
  ];
  for (const u of users) {
    await prisma.agent.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        agencyName: u.role === "AGENT" ? "Horizon Travels" : "THR.com",
        commissionBps: u.role === "AGENT" ? 500 : 0,
        agentGroupId: u.group,
        customerSegmentId: u.seg,
      },
    });
  }

  await prisma.markupRule.createMany({
    data: [
      {
        name: "Goa destination 8%",
        scope: "DESTINATION",
        type: "PERCENTAGE",
        value: 800,
        destinationId: goa.id,
        priority: 10,
      },
      {
        name: "Luxury hotel category +4%",
        scope: "HOTEL_CATEGORY",
        type: "PERCENTAGE",
        value: 400,
        hotelCategory: "luxury",
        productType: "HOTEL",
        priority: 20,
      },
      {
        name: "High cost band +₹2,000",
        scope: "PACKAGE_COST_BAND",
        type: "FIXED",
        value: 200000,
        costBandMinMinor: 5000000,
        priority: 5,
      },
      {
        name: "Retail agent group 2%",
        scope: "AGENT_GROUP",
        type: "PERCENTAGE",
        value: 200,
        agentGroupId: retail.id,
        priority: 15,
      },
    ],
  });

  await prisma.taxRule.createMany({
    data: [
      { type: "GST", name: "India GST 5% on holiday packages", rateBps: 500, nationalityIn: [] },
      { type: "TCS", name: "TCS 5% outbound (non-IN nationality waived in seed)", rateBps: 500, nationalityIn: ["IN"] },
    ],
  });

  await prisma.fxRate.createMany({
    data: [
      { fromCurrency: "INR", toCurrency: "INR", rateE6: 1_000_000 },
      { fromCurrency: "INR", toCurrency: "USD", rateE6: 12_000 },
      { fromCurrency: "INR", toCurrency: "AED", rateE6: 44_000 },
      { fromCurrency: "INR", toCurrency: "EUR", rateE6: 11_000 },
      { fromCurrency: "INR", toCurrency: "GBP", rateE6: 9_400 },
    ],
  });

  await prisma.systemSetting.createMany({
    data: [
      { key: "RATE_LOCK_HOURS", value: "24" },
      { key: "TAX_STACKING_ORDER", value: "NET,MARKUP,GST,TCS,COMMISSION" },
      { key: "MARKUP_APPROVER_ROLE", value: "REVENUE_ADMIN" },
      { key: "WHATSAPP_PROVIDER", value: "stub" },
      { key: "TRANSFER_VENDOR", value: "mock-holidaytaxis" },
      { key: "ACTIVITY_VENDOR", value: "mock-viator" },
      { key: "HOTEL_VENDOR", value: "mock-hotelbeds" },
      { key: "CANONICAL_CURRENCY", value: "INR" },
    ],
  });

  void goaTpl;
  void novotelRoom;
  void goaInnova;
  void dubaiSuv;
  void wholesale;
  void honeymoon;

  console.log("Seed complete. Demo logins: agent@thr.com / Password123! (and contracting@, revenue@, support@, finance@thr.com)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
