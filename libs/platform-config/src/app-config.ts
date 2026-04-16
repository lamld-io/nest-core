import Joi from "joi"

export type PlatformApplicationName = "gateway" | "auth-service" | "user-service"

export type PlatformAppConfigDefinition = {
  name: PlatformApplicationName
  defaultPort: number
  envPrefix: string
}

export type AuthRuntimeConfig = {
  jwtSecret: string
  accessTokenTtlSeconds: number
  refreshTokenTtlSeconds: number
}

export type ObservabilityRuntimeConfig = {
  serviceName: string
  metricsPath: string
  metricsPrefix: string
  auditEnabled: boolean
  tracingEnabled: boolean
}

export type PersistedQueryMode = "none" | "apq" | "trusted-documents"

export type GatewayRateLimitConfig = {
  ttlSeconds: number
  limit: number
}

export type GatewayGraphqlHardeningConfig = {
  maxDepth: number
  maxComplexity: number
  maxAliases: number
  introspectionEnabled: boolean
  persistedQueryMode: PersistedQueryMode
  trustedDocumentHashes: string[]
}

export type GatewayHardeningConfig = {
  rateLimit: GatewayRateLimitConfig
  graphql: GatewayGraphqlHardeningConfig
  requestTimeoutMs: number
}

export const platformAppConfig = {
  gateway: {
    name: "gateway",
    defaultPort: 3000,
    envPrefix: "GATEWAY",
  },
  authService: {
    name: "auth-service",
    defaultPort: 3001,
    envPrefix: "AUTH",
  },
  userService: {
    name: "user-service",
    defaultPort: 3002,
    envPrefix: "USER",
  },
} as const satisfies Record<string, PlatformAppConfigDefinition>

export const sharedEnvironmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().optional(),
  GATEWAY_GRAPHQL_PATH: Joi.string().default("/graphql"),
  GATEWAY_GRAPHQL_SCHEMA_FILE: Joi.string().default("dist/apps/gateway/schema.gql"),
  GATEWAY_GRAPHQL_IDE_ENABLED: Joi.boolean().truthy("true").falsy("false").default(false),
  GATEWAY_GRAPHQL_INTROSPECTION_ENABLED: Joi.boolean().truthy("true").falsy("false").default(false),
  GATEWAY_GRAPHQL_PERSISTED_QUERY_MODE: Joi.string()
    .valid("none", "apq", "trusted-documents")
    .default("none"),
  GATEWAY_GRAPHQL_TRUSTED_DOCUMENT_HASHES: Joi.string().allow("").default(""),
  GATEWAY_GRAPHQL_MAX_QUERY_DEPTH: Joi.number().integer().min(1).default(8),
  GATEWAY_GRAPHQL_MAX_QUERY_COMPLEXITY: Joi.number().integer().min(1).default(50),
  GATEWAY_GRAPHQL_MAX_QUERY_ALIASES: Joi.number().integer().min(0).default(15),
  GATEWAY_RATE_LIMIT_TTL_SECONDS: Joi.number().integer().positive().default(60),
  GATEWAY_RATE_LIMIT_LIMIT: Joi.number().integer().positive().default(30),
  GATEWAY_REQUEST_TIMEOUT_MS: Joi.number().integer().positive().default(5000),
  AUTH_JWT_SECRET: Joi.string().min(32).required(),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(900),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(604800),
  OBS_METRICS_PATH: Joi.string().default("/metrics"),
  OBS_METRICS_PREFIX: Joi.string().default("nest_core_"),
  OBS_AUDIT_ENABLED: Joi.boolean().truthy("true").falsy("false").default(true),
  OBS_TRACING_ENABLED: Joi.boolean().truthy("true").falsy("false").default(true),
})

export function createPlatformConfigNamespace(definition: PlatformAppConfigDefinition) {
  return () => {
    const jwtSecret = process.env.AUTH_JWT_SECRET

    if (!jwtSecret) {
      throw new Error("AUTH_JWT_SECRET is required")
    }

    const isDevelopment = process.env.NODE_ENV === "development"
    const isProduction = process.env.NODE_ENV === "production"

    return {
      appName: definition.name,
      envPrefix: definition.envPrefix,
      port: Number(process.env.PORT ?? definition.defaultPort),
      graphqlPath: process.env.GATEWAY_GRAPHQL_PATH ?? "/graphql",
      graphqlSchemaFile: process.env.GATEWAY_GRAPHQL_SCHEMA_FILE ?? "dist/apps/gateway/schema.gql",
      graphqlIdeEnabled: process.env.GATEWAY_GRAPHQL_IDE_ENABLED
        ? process.env.GATEWAY_GRAPHQL_IDE_ENABLED === "true"
        : isDevelopment,
      hardening: {
        rateLimit: {
          ttlSeconds: Number(process.env.GATEWAY_RATE_LIMIT_TTL_SECONDS ?? 60),
          limit: Number(process.env.GATEWAY_RATE_LIMIT_LIMIT ?? 30),
        } satisfies GatewayRateLimitConfig,
        graphql: {
          maxDepth: Number(process.env.GATEWAY_GRAPHQL_MAX_QUERY_DEPTH ?? 8),
          maxComplexity: Number(process.env.GATEWAY_GRAPHQL_MAX_QUERY_COMPLEXITY ?? 50),
          maxAliases: Number(process.env.GATEWAY_GRAPHQL_MAX_QUERY_ALIASES ?? 15),
          introspectionEnabled: process.env.GATEWAY_GRAPHQL_INTROSPECTION_ENABLED
            ? process.env.GATEWAY_GRAPHQL_INTROSPECTION_ENABLED === "true"
            : !isProduction,
          persistedQueryMode:
            (process.env.GATEWAY_GRAPHQL_PERSISTED_QUERY_MODE ?? "none") as PersistedQueryMode,
          trustedDocumentHashes: (process.env.GATEWAY_GRAPHQL_TRUSTED_DOCUMENT_HASHES ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        } satisfies GatewayGraphqlHardeningConfig,
        requestTimeoutMs: Number(process.env.GATEWAY_REQUEST_TIMEOUT_MS ?? 5000),
      } satisfies GatewayHardeningConfig,
      auth: {
        jwtSecret,
        accessTokenTtlSeconds: Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ?? 900),
        refreshTokenTtlSeconds: Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ?? 604800),
      } satisfies AuthRuntimeConfig,
      observability: {
        serviceName: definition.name,
        metricsPath: process.env.OBS_METRICS_PATH ?? "/metrics",
        metricsPrefix: process.env.OBS_METRICS_PREFIX ?? "nest_core_",
        auditEnabled: process.env.OBS_AUDIT_ENABLED
          ? process.env.OBS_AUDIT_ENABLED === "true"
          : true,
        tracingEnabled: process.env.OBS_TRACING_ENABLED
          ? process.env.OBS_TRACING_ENABLED === "true"
          : true,
      } satisfies ObservabilityRuntimeConfig,
    }
  }
}
