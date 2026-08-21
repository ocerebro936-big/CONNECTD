import type {
  ConnectedObjectStore,
} from "../storage/object-store";

import type {
  CloudEventLedger,
} from "../core/events";

export async function
validateConnectedCloud(
  storage: ConnectedObjectStore,
  events: CloudEventLedger,
) {

  const checks: Array<{
    name: string;
    ok: boolean;
    message?: string;
  }> = [];

  try {

    const key =
      `system/validation/${crypto.randomUUID()}.txt`;

    const data =
      new TextEncoder().encode(
        "CONNECTED-CLOUD-VALIDATION",
      );

    await storage.put(
      key,
      data,
      {
        contentType:
          "text/plain",
      },
    );

    const exists =
      await storage.exists(key);

    await storage.delete(key);

    checks.push({
      name:
        "storage-write-read-delete",

      ok:
        exists,
    });

  } catch (error) {

    checks.push({
      name:
        "storage-write-read-delete",

      ok:
        false,

      message:
        String(error),
    });
  }

  try {

    await events.append({
      eventId:
        crypto.randomUUID(),

      type:
        "VALIDATION",

      timestamp:
        new Date().toISOString(),

      requestId:
        crypto.randomUUID(),

      result:
        "success",
    });

    checks.push({
      name:
        "event-ledger",

      ok:
        true,
    });

  } catch (error) {

    checks.push({
      name:
        "event-ledger",

      ok:
        false,

      message:
        String(error),
    });
  }

  return {
    ok:
      checks.every(
        (check) =>
          check.ok,
      ),

    checks,

    timestamp:
      new Date().toISOString(),
  };
}
