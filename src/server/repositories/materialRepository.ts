import "server-only";
import { PrismaClient } from "@prisma/client";
import { materialSchema, idSchema } from "@/domain/manufacturing/schemas";
export function createMaterial(db: PrismaClient, input: unknown) {
  return db.material.create({ data: materialSchema.parse(input) });
}
export function replaceMaterial(db: PrismaClient, id: string, input: unknown) {
  return db.material.update({
    where: { id: idSchema.parse(id) },
    data: materialSchema.parse(input),
  });
}
