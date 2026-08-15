import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@thr/db";
import { MEAL_PLANS, TRANSFER_TYPES } from "@thr/shared";
import { requireAuth, getUser } from "../auth.js";
import { ApiError } from "../errors.js";
import { persistPackage, priceState } from "../services/search.js";
import type { PackageState } from "@thr/shared";

const hotelSwap = z.object({
  nightIndex: z.number().int().min(0).optional(),
  hotelId: z.string(),
  roomTypeId: z.string(),
  mealPlan: z.enum(MEAL_PLANS).optional(),
  applyToAllNights: z.boolean().default(true),
});

const vehicleSwap = z.object({
  vehicleId: z.string(),
});

const activityMut = z.object({
  dayNumber: z.number().int().min(1),
  activityId: z.string().nullable(),
  optionId: z.string().nullable(),
  transferType: z.enum(TRANSFER_TYPES).optional(),
});

async function loadState(id: string): Promise<PackageState> {
  const row = await prisma.package.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, "Package not found", "NOT_FOUND");
  return row.stateJson as unknown as PackageState;
}

export async function packageRoutes(app: FastifyInstance) {
  app.get("/packages/:id", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const user = getUser(req);
    const state = await loadState(id);
    return priceState(state, user.commissionBps);
  });

  app.get("/packages/:id/hotels", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const state = await loadState(id);
    const q = req.query as {
      minPrice?: string;
      maxPrice?: string;
      stars?: string;
      mealPlan?: string;
      tag?: string;
    };
    const hotels = await prisma.hotel.findMany({
      where: {
        destinationId: state.destinationId,
        ...(q.stars ? { starRating: Number(q.stars) } : {}),
        ...(q.tag ? { tags: { has: q.tag } } : {}),
      },
      include: {
        roomTypes: { include: { rates: true } },
      },
      orderBy: [{ priorityRanking: "asc" }, { starRating: "desc" }],
    });
    return hotels.filter((h) => {
      if (q.mealPlan && !h.roomTypes.some((r) => r.mealPlan === q.mealPlan)) return false;
      const price = h.roomTypes[0]?.rates[0]?.priceMinor ?? 0;
      if (q.minPrice && price < Number(q.minPrice)) return false;
      if (q.maxPrice && price > Number(q.maxPrice)) return false;
      return true;
    });
  });

  app.get("/packages/:id/vehicles", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const state = await loadState(id);
    return prisma.vehicle.findMany({
      where: { destinationId: state.destinationId },
      include: { rates: true },
    });
  });

  app.get("/packages/:id/activities", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const state = await loadState(id);
    return prisma.activity.findMany({
      where: { destinationId: state.destinationId },
      include: { options: true },
    });
  });

  app.patch("/packages/:id/hotel", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const body = hotelSwap.parse(req.body);
    const user = getUser(req);
    const state = await loadState(id);
    const room = await prisma.roomType.findUnique({ where: { id: body.roomTypeId } });
    if (!room || room.hotelId !== body.hotelId) {
      throw new ApiError(400, "roomTypeId does not belong to hotelId", "VALIDATION_ERROR");
    }
    const next = {
      ...state,
      hotels: state.hotels.map((h, i) => {
        const match = body.applyToAllNights || i === body.nightIndex;
        if (!match) return h;
        return {
          ...h,
          hotelId: body.hotelId,
          roomTypeId: body.roomTypeId,
          mealPlan: body.mealPlan ?? room.mealPlan,
        };
      }),
    };
    const priced = await priceState(next, user.commissionBps);
    await persistPackage(priced, user.id);
    return priced;
  });

  app.patch("/packages/:id/vehicle", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const body = vehicleSwap.parse(req.body);
    const user = getUser(req);
    const state = await loadState(id);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId } });
    if (!vehicle) throw new ApiError(404, "Vehicle not found", "NOT_FOUND");
    if (vehicle.destinationId !== state.destinationId) {
      throw new ApiError(400, "Vehicle is not available in this destination.", "VALIDATION_ERROR");
    }
    const priced = await priceState({ ...state, vehicleId: body.vehicleId }, user.commissionBps);
    await persistPackage(priced, user.id);
    return priced;
  });

  app.patch("/packages/:id/activities", { preHandler: requireAuth }, async (req) => {
    const { id } = req.params as { id: string };
    const body = activityMut.parse(req.body);
    const user = getUser(req);
    const state = await loadState(id);
    let activities = state.activities.filter((a) => a.dayNumber !== body.dayNumber);
    if (body.activityId && body.optionId) {
      const opt = await prisma.activityOption.findUnique({ where: { id: body.optionId } });
      if (!opt || opt.activityId !== body.activityId) {
        throw new ApiError(400, "optionId does not belong to activityId", "VALIDATION_ERROR");
      }
      activities = [
        ...activities,
        {
          dayNumber: body.dayNumber,
          activityId: body.activityId,
          optionId: body.optionId,
          transferType: body.transferType ?? opt.transferType,
        },
      ];
    }
    const priced = await priceState({ ...state, activities }, user.commissionBps);
    await persistPackage(priced, user.id);
    return priced;
  });
}
