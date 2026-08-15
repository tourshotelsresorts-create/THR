import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import type { Role } from "@thr/shared";
import { prisma } from "@thr/db";
import { env } from "./env.js";
import { ApiError } from "./errors.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  agentGroupId?: string | null;
  customerSegmentId?: string | null;
  commissionBps: number;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function readUser(req: FastifyRequest): AuthUser | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), env.jwtSecret) as AuthUser;
  } catch {
    return null;
  }
}

async function hydrateUser(tokenUser: AuthUser): Promise<AuthUser> {
  const agent =
    (await prisma.agent.findUnique({ where: { id: tokenUser.id } })) ??
    (await prisma.agent.findUnique({ where: { email: tokenUser.email } }));
  if (!agent?.active) {
    throw new ApiError(401, "Session expired after a data refresh. Please sign in again.", "SESSION_STALE");
  }
  return {
    id: agent.id,
    email: agent.email,
    name: agent.name,
    role: agent.role,
    agentGroupId: agent.agentGroupId,
    customerSegmentId: agent.customerSegmentId,
    commissionBps: agent.commissionBps,
  };
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const tokenUser = readUser(req);
  if (!tokenUser) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
  (req as FastifyRequest & { user: AuthUser }).user = await hydrateUser(tokenUser);
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest): Promise<void> => {
    const existing = (req as FastifyRequest & { user?: AuthUser }).user;
    const tokenUser = existing ?? readUser(req);
    if (!tokenUser) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
    const user = existing?.id
      ? existing
      : await hydrateUser(tokenUser);
    (req as FastifyRequest & { user: AuthUser }).user = user;
    if (!roles.includes(user.role)) {
      throw new ApiError(403, `Role ${user.role} cannot access this resource`, "FORBIDDEN");
    }
  };
}

export function getUser(req: FastifyRequest): AuthUser {
  const user = (req as FastifyRequest & { user?: AuthUser }).user;
  if (!user) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
  return user;
}
