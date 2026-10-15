import { ManufacturingEvent } from "@/domain/manufacturing/manufacturingEvent";
import {
  ReadOnlyEventAdapter,
  ConnectionState,
  parseIncomingEvents,
} from "./importEventAdapter";

/**
 * Read-only MQTT subscription interface.
 * Strictly subscription-only; does not expose any publish or control methods.
 */
export interface MqttSubscription {
  subscribe(topic: string, onMessage: (payload: unknown) => void): () => void;
}

/**
 * Read-only MQTT event adapter.
 * Connects to an MQTT subscription source on a designated topic.
 */
export class MqttEventAdapter implements ReadOnlyEventAdapter {
  constructor(
    private broker: MqttSubscription,
    private topic: string,
  ) {}

  connect(
    onEvent: (event: ManufacturingEvent) => void,
    onStatus: (state: ConnectionState) => void,
  ): () => void {
    onStatus({ status: "CONNECTING", lastReceived: null });

    try {
      const unsubscribe = this.broker.subscribe(this.topic, (data) => {
        try {
          parseIncomingEvents(data, onEvent);
          onStatus({ status: "CONNECTED", lastReceived: Date.now() });
        } catch (err) {
          onStatus({
            status: "ERROR",
            lastReceived: null,
            error: `Invalid MQTT payload: ${(err as Error).message}`,
          });
        }
      });

      onStatus({ status: "CONNECTED", lastReceived: Date.now() });

      return () => {
        unsubscribe();
        onStatus({ status: "DISCONNECTED", lastReceived: null });
      };
    } catch (e) {
      onStatus({
        status: "ERROR",
        lastReceived: null,
        error: (e as Error).message,
      });
      return () => {
        onStatus({ status: "DISCONNECTED", lastReceived: null });
      };
    }
  }
}
