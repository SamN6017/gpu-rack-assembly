import {
  manufacturingEventSchema,
  ManufacturingEvent,
} from "@/domain/manufacturing/manufacturingEvent";

export type ConnectionState = {
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
  lastReceived: number | null;
  error?: string;
};

export interface ReadOnlyEventAdapter {
  connect(
    onEvent: (event: ManufacturingEvent) => void,
    onStatus: (state: ConnectionState) => void,
  ): () => void;
}

export function parseIncomingEvents(
  input: unknown,
  onEvent: (event: ManufacturingEvent) => void,
) {
  const items = Array.isArray(input) ? input : [input];
  for (const item of items) {
    onEvent(manufacturingEventSchema.parse(item));
  }
}

export class ImportedEventAdapter implements ReadOnlyEventAdapter {
  constructor(private rows: unknown[]) {}

  connect(
    onEvent: (event: ManufacturingEvent) => void,
    onStatus: (state: ConnectionState) => void,
  ): () => void {
    try {
      parseIncomingEvents(this.rows, onEvent);
      onStatus({ status: "CONNECTED", lastReceived: Date.now() });
    } catch (e) {
      onStatus({
        status: "ERROR",
        lastReceived: null,
        error: (e as Error).message,
      });
    }

    return () => {
      onStatus({ status: "DISCONNECTED", lastReceived: null });
    };
  }
}
