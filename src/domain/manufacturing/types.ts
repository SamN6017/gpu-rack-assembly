import type { z } from "zod";
import type {
  materialSchema,
  bomSchema,
  inventoryEventSchema,
  reservationSchema,
} from "./schemas";
export type MaterialInput = z.input<typeof materialSchema>;
export type BomInput = z.input<typeof bomSchema>;
export type InventoryEventInput = z.input<typeof inventoryEventSchema>;
export type ReservationInput = z.input<typeof reservationSchema>;
