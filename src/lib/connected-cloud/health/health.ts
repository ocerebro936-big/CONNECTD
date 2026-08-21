export type HealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy";

export interface HealthCheck {
  name: string;

  check(): Promise<{
    status: HealthStatus;

    latencyMs?: number;

    details?: Record<
      string,
      unknown
    >;
  }>;
}

export async function
runHealthChecks(
  checks: HealthCheck[],
) {

  const results =
    await Promise.all(
      checks.map(
        async (check) => ({
          name: check.name,
          ...(await check.check()),
        }),
      ),
    );

  const status =
    results.some(
      (result) =>
        result.status ===
        "unhealthy",
    )
      ? "unhealthy"
      : results.some(
          (result) =>
            result.status ===
            "degraded",
        )
        ? "degraded"
        : "healthy";

  return {
    status,

    timestamp:
      new Date().toISOString(),

    services:
      results,
  };
}
