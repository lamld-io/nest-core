import client from "prom-client"

export const platformMetricsRegistry = new client.Registry()

export const platformRequestCounter = new client.Counter({
  name: "nest_core_requests_total",
  help: "Total handled requests grouped by service and outcome",
  labelNames: ["service", "outcome"] as const,
  registers: [platformMetricsRegistry],
})

export const platformAuditCounter = new client.Counter({
  name: "nest_core_audit_events_total",
  help: "Total audit events grouped by service and event type",
  labelNames: ["service", "eventType", "outcome"] as const,
  registers: [platformMetricsRegistry],
})

client.collectDefaultMetrics({
  register: platformMetricsRegistry,
  prefix: "nest_core_",
})

export async function renderPlatformMetrics(): Promise<string> {
  return platformMetricsRegistry.metrics()
}
