export const platformConfigModuleName = "platform-config" as const

export const platformConfigTokens = {
  appConfig: "platform.config.app",
  authConfig: "platform.config.auth",
  observabilityConfig: "platform.config.observability",
} as const

export type PlatformConfigToken =
  (typeof platformConfigTokens)[keyof typeof platformConfigTokens]

export type RequiredEnvironmentVariable = {
  name: string
  description: string
  required: boolean
}

export const platformConfigBaseline = {
  failFastOnMissingConfig: true,
  envFiles: [".env", ".env.local", ".env.development"],
  validationStrategy: "startup-schema-validation",
} as const
