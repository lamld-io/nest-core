export const platformLoggerModuleName = "platform-logger" as const

export const platformLoggerFields = [
  "timestamp",
  "level",
  "service",
  "message",
  "requestId",
  "traceId",
  "tenantId",
  "userId",
  "operationName",
  "errorCode",
] as const

export type PlatformLoggerField = (typeof platformLoggerFields)[number]

export const platformLoggerBaseline = {
  implementation: "di-managed-pino-adapter",
  bufferLogsAtBootstrap: true,
  redactFields: ["password", "accessToken", "refreshToken", "authorization"],
} as const
