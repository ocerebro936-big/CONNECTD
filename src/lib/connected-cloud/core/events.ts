import type {
  CloudEvent,
} from "./types";

export interface CloudEventLedger {
  append(
    event: CloudEvent,
  ): Promise<void>;

  list(
    resourceId?: string,
  ): Promise<CloudEvent[]>;
}

export class MemoryCloudEventLedger
  implements CloudEventLedger {

  private events: CloudEvent[] = [];

  async append(event: CloudEvent) {
    this.events.push(event);
  }

  async list(resourceId?: string) {
    if (!resourceId) {
      return [...this.events];
    }

    return this.events.filter(
      (event) =>
        event.resourceId === resourceId,
    );
  }
}
