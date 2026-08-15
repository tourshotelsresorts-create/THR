import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import type { Role } from "@thr/shared";
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

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = readUser(req);
  if (!user) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
  (req as FastifyRequest & { user: AuthUser }).user = user;
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest): Promise<void> => {
    const user = (req as FastifyRequest & { user?: AuthUser }).user ?? readUser(req);
    if (!user) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
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
