import { prisma } from "@thr/db";
import type { AuthUser } from "../auth.js";

export async function writeAudit(
  user: AuthUser | null,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: user?.id,
      entityType,
      entityId,
      action,
      beforeJson: before as object | undefined,
      afterJson: after as object | undefined,
    },
  });
}
