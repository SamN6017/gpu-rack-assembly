import { ManufacturingEvent } from "@/domain/manufacturing/manufacturingEvent";
import {
  ReadOnlyEventAdapter,
  ConnectionState,
  parseIncomingEvents,
} from "./importEventAdapter";

function validateUrl(url: string, allowedProtocols: string[]): string {
  const parsed = new URL(url);
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(
      `Unsupported protocol '${parsed.protocol}'. Allowed: ${allowedProtocols.join(", ")}`,
    );
  }
  return parsed.toString();
}

/**
 * Read-only REST polling adapter.
 * Uses HTTP GET only with credentials omitted and cache disabled.
 */
export class RestEventAdapter implements ReadOnlyEventAdapter {
  constructor(private url: string) {}

  connect(
    onEvent: (event: ManufacturingEvent) => void,
    onStatus: (state: ConnectionState) => void,
  ): () => void {
    const controller = new AbortController();
    onStatus({ status: "CONNECTING", lastReceived: null });

    try {
      const endpoint = validateUrl(this.url, ["https:", "http:"]);
      fetch(endpoint, {
        method: "GET",
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
      })
        .then((r) => {
          if (!r.ok) throw new Error(`Source HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          parseIncomingEvents(data, onEvent);
          onStatus({ status: "CONNECTED", lastReceived: Date.now() });
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            onStatus({
              status: "ERROR",
              lastReceived: null,
              error: (e as Error).message,
            });
          }
        });
    } catch (e) {
      onStatus({
        status: "ERROR",
        lastReceived: null,
        error: (e as Error).message,
      });
    }

    return () => {
      controller.abort();
      onStatus({ status: "DISCONNECTED", lastReceived: null });
    };
  }
}
