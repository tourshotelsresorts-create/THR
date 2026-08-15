import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "@thr/db";
import { signToken } from "../auth.js";
import { ApiError } from "../errors.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ssoSchema = z.object({
  /** Stub SSO: THR.com would post a signed assertion. Accept email for local/demo. */
  email: z.string().email(),
  assertion: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req) => {
    const body = loginSchema.parse(req.body);
    const agent = await prisma.agent.findUnique({ where: { email: body.email } });
    if (!agent || !agent.active) throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    const ok = await compare(body.password, agent.passwordHash);
    if (!ok) throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    const user = {
      id: agent.id,
      email: agent.email,
      name: agent.name,
      role: agent.role,
      agentGroupId: agent.agentGroupId,
      customerSegmentId: agent.customerSegmentId,
      commissionBps: agent.commissionBps,
    };
    return { token: signToken(user), user };
  });

  app.post("/auth/sso/callback", async (req) => {
    const body = ssoSchema.parse(req.body);
    const agent = await prisma.agent.findUnique({ where: { email: body.email } });
    if (!agent) throw new ApiError(401, "SSO user not provisioned", "SSO_UNKNOWN_USER");
    const user = {
      id: agent.id,
      email: agent.email,
      name: agent.name,
      role: agent.role,
      agentGroupId: agent.agentGroupId,
      customerSegmentId: agent.customerSegmentId,
      commissionBps: agent.commissionBps,
    };
    return { token: signToken(user), user, provider: "thr-sso-stub" };
  });

  app.get("/auth/me", async (req) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
    return { ok: true };
  });
}
