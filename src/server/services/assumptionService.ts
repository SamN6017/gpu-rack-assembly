import "server-only";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { assumptionSchema, idSchema } from "@/domain/manufacturing/schemas";
import { contentHash } from "./contentHash";
import { DomainError, serializable } from "./transaction";
export function proposeAssumption(db: PrismaClient, input: unknown) {
  const data = assumptionSchema.parse(input);
  return db.dataAssumption.create({
    data: { ...data, contentHash: contentHash(data) },
  });
}
export async function approveAssumption(
  db: PrismaClient,
  id: string,
  expectedHash: string,
  actor: string,
) {
  idSchema.parse(id);
  z.string().trim().min(1).max(200).parse(actor);
  return serializable(db, async (tx) => {
    const row = await tx.dataAssumption.findUniqueOrThrow({ where: { id } });
    if (row.contentHash !== expectedHash || row.status !== "PROPOSED")
      throw new DomainError(
        "STALE_APPROVAL",
        "Review the current proposed assumption before approving",
      );
    return tx.dataAssumption.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: actor, approvedAt: new Date() },
    });
  });
}
