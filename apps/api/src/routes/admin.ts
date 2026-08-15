import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "@thr/db";
import { requireRole, getUser, type AuthUser } from "../auth.js";
import { writeAudit } from "../services/audit.js";
import { parseCsv } from "../services/csv.js";
import { getSettings } from "../services/settings.js";
import { ApiError } from "../errors.js";

const contracting = requireRole("CONTRACTING_ADMIN", "REVENUE_ADMIN");
const revenue = requireRole("REVENUE_ADMIN");
const staff = requireRole("CONTRACTING_ADMIN", "REVENUE_ADMIN", "SUPPORT", "FINANCE_READONLY");
const writeStaff = requireRole("CONTRACTING_ADMIN", "REVENUE_ADMIN", "SUPPORT");

function actor(req: FastifyRequest): AuthUser {
  return getUser(req);
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/settings", { preHandler: staff }, async () => getSettings());

  app.put("/admin/settings/:key", { preHandler: revenue }, async (req) => {
    const { key } = req.params as { key: string };
    const body = z.object({ value: z.string() }).parse(req.body);
    const before = await prisma.systemSetting.findUnique({ where: { key } });
    const row = await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: body.value },
      update: { value: body.value },
    });
    await writeAudit(actor(req), "SystemSetting", key, "upsert", before, row);
    return row;
  });

  app.get("/admin/audit", { preHandler: staff }, async (req) => {
    const q = req.query as { entityType?: string; entityId?: string };
    return prisma.auditLog.findMany({
      where: {
        entityType: q.entityType,
        entityId: q.entityId,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: { select: { email: true, name: true } } },
    });
  });

  registerCrud(app, "destinations", "Destination", prisma.destination, {
    create: z.object({
      country: z.string(),
      city: z.string(),
      countryCode: z.string(),
      airports: z.any().optional(),
      attractions: z.any().optional(),
      mapsUrl: z.string().optional(),
      weather: z.string().optional(),
      bestSeason: z.string().optional(),
      visaInfo: z.string().optional(),
    }),
  });

  registerCrud(app, "suppliers", "Supplier", prisma.supplier, {
    create: z.object({
      name: z.string(),
      type: z.enum(["HOTEL", "VEHICLE", "ACTIVITY", "DMC"]),
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      contactPhone: z.string().optional(),
      commercialTermsRef: z.string().optional(),
    }),
  });

  registerCrud(app, "hotels", "Hotel", prisma.hotel, {
    create: z.object({
      name: z.string(),
      destinationId: z.string(),
      category: z.string(),
      starRating: z.number().int().min(1).max(5),
      validFrom: z.coerce.date(),
      validTo: z.coerce.date(),
      blackoutDates: z.any().optional(),
      supplierId: z.string(),
      priorityRanking: z.number().int().optional(),
      reviewScore: z.number().optional(),
      distanceFromCityKm: z.number().optional(),
      tags: z.array(z.string()).optional(),
      minStayNights: z.number().int().optional(),
      childPolicyId: z.string().optional(),
      cancellationPolicyId: z.string().optional(),
      apiHotelCode: z.string().optional(),
    }),
    include: { roomTypes: true, destination: true, supplier: true },
  });

  registerCrud(app, "room-types", "RoomType", prisma.roomType, {
    create: z.object({
      hotelId: z.string(),
      name: z.string(),
      sizeSqm: z.number().int().optional(),
      maxOccupancy: z.number().int(),
      mealPlan: z.enum(["EP", "CP", "MAP", "AP"]),
      apiRoomCode: z.string().optional(),
    }),
  });

  registerCrud(app, "hotel-rates", "HotelRate", prisma.hotelRate, {
    create: z.object({
      roomTypeId: z.string(),
      source: z.enum(["STATIC", "API"]),
      currency: z.string().default("INR"),
      priceMinor: z.number().int(),
      validFrom: z.coerce.date(),
      validTo: z.coerce.date(),
      seasonalRuleId: z.string().optional(),
    }),
  });

  registerCrud(app, "vehicles", "Vehicle", prisma.vehicle, {
    create: z.object({
      name: z.string(),
      type: z.enum(["SEDAN", "SUV", "PREMIUM_SUV_INNOVA", "LUXURY", "VAN", "MINI_COACH", "COACH"]),
      seatingCapacity: z.number().int(),
      supplierId: z.string(),
      destinationId: z.string(),
      city: z.string(),
      route: z.string().optional(),
      operatingHoursFrom: z.string().optional(),
      operatingHoursTo: z.string().optional(),
    }),
    include: { rates: true },
  });

  registerCrud(app, "vehicle-rates", "VehicleRate", prisma.vehicleRate, {
    create: z.object({
      vehicleId: z.string(),
      airportTransferMinor: z.number().int(),
      sicRateMinor: z.number().int(),
      privateRateMinor: z.number().int(),
      extraHourMinor: z.number().int(),
      driverChargeMinor: z.number().int(),
      tollMinor: z.number().int(),
      parkingMinor: z.number().int(),
      fuelSurchargeMinor: z.number().int(),
      nightChargeMinor: z.number().int(),
      validFrom: z.coerce.date(),
      validTo: z.coerce.date(),
      seasonalRuleId: z.string().optional(),
    }),
  });

  registerCrud(app, "activities", "Activity", prisma.activity, {
    create: z.object({
      name: z.string(),
      description: z.string(),
      destinationId: z.string(),
      durationMinutes: z.number().int(),
      recommendedTime: z.string().optional(),
      category: z.string(),
      supplierId: z.string(),
      operatingDays: z.array(z.number().int()).optional(),
    }),
    include: { options: true },
  });

  registerCrud(app, "activity-options", "ActivityOption", prisma.activityOption, {
    create: z.object({
      activityId: z.string(),
      name: z.string(),
      transferIncluded: z.boolean(),
      transferType: z.enum(["NONE", "SIC", "PRIVATE"]),
      pickupTime: z.string().optional(),
      adultRateMinor: z.number().int(),
      childRateMinor: z.number().int(),
      seniorRateMinor: z.number().int(),
      cancellationRules: z.string().optional(),
      instantConfirmation: z.boolean().optional(),
      voucherType: z.string().optional(),
    }),
  });

  registerCrud(app, "child-policies", "ChildPolicy", prisma.childPolicy, {
    create: z.object({
      name: z.string(),
      freeUntilAge: z.number().int(),
      childRateFrom: z.number().int(),
      childRateTo: z.number().int(),
      extraBedAllowed: z.boolean().optional(),
      notes: z.string().optional(),
    }),
  });

  registerCrud(app, "cancellation-policies", "CancellationPolicy", prisma.cancellationPolicy, {
    create: z.object({
      name: z.string(),
      rulesJson: z.any(),
      description: z.string().optional(),
    }),
  });

  app.get("/admin/markup-rules", { preHandler: staff }, async () => {
    return prisma.markupRule.findMany({ orderBy: [{ scope: "asc" }, { priority: "asc" }] });
  });

  app.post("/admin/markup-rules", { preHandler: revenue }, async (req) => {
    const body = z
      .object({
        name: z.string(),
        scope: z.enum([
          "DESTINATION",
          "HOTEL_CATEGORY",
          "PACKAGE_COST_BAND",
          "AGENT_GROUP",
          "CUSTOMER_SEGMENT",
          "SUPPLIER",
          "PRODUCT_TYPE",
        ]),
        type: z.enum(["FIXED", "PERCENTAGE"]),
        value: z.number().int(),
        destinationId: z.string().optional(),
        hotelCategory: z.string().optional(),
        costBandMinMinor: z.number().int().optional(),
        costBandMaxMinor: z.number().int().optional(),
        agentGroupId: z.string().optional(),
        customerSegmentId: z.string().optional(),
        supplierId: z.string().optional(),
        productType: z.string().optional(),
        validFrom: z.coerce.date().optional(),
        validTo: z.coerce.date().optional(),
        priority: z.number().int().optional(),
        exclusive: z.boolean().optional(),
        enabled: z.boolean().optional(),
      })
      .parse(req.body);
    const row = await prisma.markupRule.create({ data: body });
    await writeAudit(actor(req), "MarkupRule", row.id, "create", null, row);
    return row;
  });

  app.patch("/admin/markup-rules/:id", { preHandler: revenue }, async (req) => {
    const { id } = req.params as { id: string };
    const before = await prisma.markupRule.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, "Not found", "NOT_FOUND");
    const row = await prisma.markupRule.update({ where: { id }, data: req.body as object });
    await writeAudit(actor(req), "MarkupRule", id, "update", before, row);
    return row;
  });

  app.delete("/admin/markup-rules/:id", { preHandler: revenue }, async (req) => {
    const { id } = req.params as { id: string };
    const before = await prisma.markupRule.delete({ where: { id } });
    await writeAudit(actor(req), "MarkupRule", id, "delete", before, null);
    return { ok: true };
  });

  app.get("/admin/tax-rules", { preHandler: staff }, async () => prisma.taxRule.findMany());
  app.post("/admin/tax-rules", { preHandler: revenue }, async (req) => {
    const body = z
      .object({
        type: z.enum(["GST", "TCS"]),
        name: z.string(),
        rateBps: z.number().int(),
        nationalityIn: z.array(z.string()).optional(),
        minTaxableMinor: z.number().int().optional(),
      })
      .parse(req.body);
    return prisma.taxRule.create({ data: body });
  });

  app.get("/admin/agents", { preHandler: staff }, async () =>
    prisma.agent.findMany({ select: { id: true, email: true, name: true, role: true, agencyName: true, active: true } }),
  );

  app.post("/admin/:entity/import", { preHandler: writeStaff }, async (req) => {
    const { entity } = req.params as { entity: string };
    const body = z.object({ csv: z.string() }).parse(req.body);
    const rows = parseCsv(body.csv);
    return { entity, imported: rows.length, preview: rows.slice(0, 5) };
  });
}

function registerCrud(
  app: FastifyInstance,
  path: string,
  entity: string,
  model: any,
  opts: { create: z.ZodType; include?: object },
) {
  const read = requireRole("CONTRACTING_ADMIN", "REVENUE_ADMIN", "SUPPORT", "FINANCE_READONLY");
  const write = requireRole("CONTRACTING_ADMIN", "REVENUE_ADMIN");

  app.get(`/admin/${path}`, { preHandler: read }, async (req) => {
    const q = req.query as { q?: string };
    return model.findMany({
      ...(opts.include ? { include: opts.include } : {}),
      take: 200,
      ...(q.q ? {} : {}),
    });
  });

  app.get(`/admin/${path}/:id`, { preHandler: read }, async (req) => {
    const { id } = req.params as { id: string };
    const row = await model.findUnique({ where: { id }, ...(opts.include ? { include: opts.include } : {}) });
    if (!row) throw new ApiError(404, `${entity} not found`, "NOT_FOUND");
    return row;
  });

  app.post(`/admin/${path}`, { preHandler: write }, async (req) => {
    const data = opts.create.parse(req.body);
    const row = await model.create({ data });
    await writeAudit(actor(req), entity, row.id, "create", null, row);
    return row;
  });

  app.patch(`/admin/${path}/:id`, { preHandler: write }, async (req) => {
    const { id } = req.params as { id: string };
    const before = await model.findUnique({ where: { id } });
    const row = await model.update({ where: { id }, data: req.body });
    await writeAudit(actor(req), entity, id, "update", before, row);
    return row;
  });

  app.delete(`/admin/${path}/:id`, { preHandler: write }, async (req) => {
    const { id } = req.params as { id: string };
    const before = await model.delete({ where: { id } });
    await writeAudit(actor(req), entity, id, "delete", before, null);
    return { ok: true };
  });
}
