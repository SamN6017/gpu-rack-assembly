import { ManufacturingEvent } from "@/domain/manufacturing/manufacturingEvent";
import {
  ReadOnlyEventAdapter,
  ConnectionState,
  parseIncomingEvents,
} from "./importEventAdapter";

/**
 * Read-only Server-Sent Events (SSE) adapter.
 * Uses native EventSource; unidirectional server-to-client streaming.
 */
export class SseEventAdapter implements ReadOnlyEventAdapter {
  constructor(private url: string) {}

  connect(
    onEvent: (event: ManufacturingEvent) => void,
    onStatus: (state: ConnectionState) => void,
  ): () => void {
    onStatus({ status: "CONNECTING", lastReceived: null });

    let source: EventSource | null = null;
    try {
      const parsed = new URL(this.url);
      if (!["https:", "http:"].includes(parsed.protocol)) {
        throw new Error(`Unsupported SSE protocol: ${parsed.protocol}`);
      }

      source = new EventSource(parsed.toString());

      source.onmessage = (e) => {
        try {
          parseIncomingEvents(JSON.parse(e.data), onEvent);
          onStatus({ status: "CONNECTED", lastReceived: Date.now() });
        } catch (err) {
          onStatus({
            status: "ERROR",
            lastReceived: null,
            error: `Invalid SSE event: ${(err as Error).message}`,
          });
        }
      };

      source.onerror = () => {
        onStatus({ status: "ERROR", lastReceived: null, error: "SSE source disconnected" });
      };
    } catch (e) {
      onStatus({
        status: "ERROR",
        lastReceived: null,
        error: (e as Error).message,
      });
    }

    return () => {
      source?.close();
      onStatus({ status: "DISCONNECTED", lastReceived: null });
    };
  }
}
