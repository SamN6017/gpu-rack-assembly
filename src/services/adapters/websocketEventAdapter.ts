import { ManufacturingEvent } from "@/domain/manufacturing/manufacturingEvent";
import {
  ReadOnlyEventAdapter,
  ConnectionState,
  parseIncomingEvents,
} from "./importEventAdapter";

/**
 * Read-only WebSocket streaming adapter connecting to wss:// endpoints.
 * Inbound events are parsed and dispatched. No outbound command dispatch capability.
 */
export class WebSocketEventAdapter implements ReadOnlyEventAdapter {
  constructor(private url: string) {}

  connect(
    onEvent: (event: ManufacturingEvent) => void,
    onStatus: (state: ConnectionState) => void,
  ): () => void {
    onStatus({ status: "CONNECTING", lastReceived: null });

    let ws: WebSocket | null = null;
    try {
      const parsed = new URL(this.url);
      if (!["wss:", "ws:"].includes(parsed.protocol)) {
        throw new Error(`Unsupported WebSocket protocol: ${parsed.protocol}`);
      }

      ws = new WebSocket(parsed.toString());

      ws.onmessage = (e) => {
        try {
          parseIncomingEvents(JSON.parse(String(e.data)), onEvent);
          onStatus({ status: "CONNECTED", lastReceived: Date.now() });
        } catch (err) {
          onStatus({
            status: "ERROR",
            lastReceived: null,
            error: `Invalid event payload: ${(err as Error).message}`,
          });
        }
      };

      ws.onerror = () => {
        onStatus({ status: "ERROR", lastReceived: null, error: "WebSocket connection error" });
      };

      ws.onclose = () => {
        onStatus({ status: "DISCONNECTED", lastReceived: null });
      };
    } catch (e) {
      onStatus({
        status: "ERROR",
        lastReceived: null,
        error: (e as Error).message,
      });
    }

    return () => {
      ws?.close();
      onStatus({ status: "DISCONNECTED", lastReceived: null });
    };
  }
}
