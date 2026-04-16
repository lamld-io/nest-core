import { Module } from "@nestjs/common"

export const platformObservabilityModuleName = "platform-observability" as const

export const platformTelemetrySignals = {
  logs: true,
  traces: true,
  metrics: true,
} as const

export const platformTraceContextHeaders = [
  "traceparent",
  "tracestate",
  "x-request-id",
  "x-tenant-id",
] as const

export type PlatformTraceHeader = (typeof platformTraceContextHeaders)[number]

export const platformObservabilityBaseline = {
  traceBootstrapOrder: "before-app-bootstrap",
  metricsBackend: "prometheus",
  logBackend: "loki",
  traceBackend: "tempo",
  dashboardScope: ["gateway", "auth-service", "user-service"],
} as const

export type PlatformObservabilityOptions = {
  serviceName: string
  enableMetrics: boolean
  enableTracing: boolean
}

export function createPlatformObservabilityOptions(serviceName: string): PlatformObservabilityOptions {
  return {
    serviceName,
    enableMetrics: platformTelemetrySignals.metrics,
    enableTracing: platformTelemetrySignals.traces,
  }
}

@Module({})
export class PlatformObservabilityModule {}
