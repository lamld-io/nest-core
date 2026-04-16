export const platformHealthModuleName = "platform-health" as const

export const platformHealthRoutes = {
  liveness: "/health",
  readiness: "/health/ready",
} as const

export type PlatformHealthRoute =
  (typeof platformHealthRoutes)[keyof typeof platformHealthRoutes]
