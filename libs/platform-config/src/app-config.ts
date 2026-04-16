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
  AUTH_JWT_SECRET: Joi.string().min(32).required(),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(900),
  AUTH_REFRESH_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(604800),
})

export function createPlatformConfigNamespace(definition: PlatformAppConfigDefinition) {
  return () => {
    const jwtSecret = process.env.AUTH_JWT_SECRET

    if (!jwtSecret) {
      throw new Error("AUTH_JWT_SECRET is required")
    }

    const isDevelopment = process.env.NODE_ENV === "development"

    return {
      appName: definition.name,
      envPrefix: definition.envPrefix,
      port: Number(process.env.PORT ?? definition.defaultPort),
      graphqlPath: process.env.GATEWAY_GRAPHQL_PATH ?? "/graphql",
      graphqlSchemaFile: process.env.GATEWAY_GRAPHQL_SCHEMA_FILE ?? "dist/apps/gateway/schema.gql",
      graphqlIdeEnabled: process.env.GATEWAY_GRAPHQL_IDE_ENABLED
        ? process.env.GATEWAY_GRAPHQL_IDE_ENABLED === "true"
        : isDevelopment,
      auth: {
        jwtSecret,
        accessTokenTtlSeconds: Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS ?? 900),
        refreshTokenTtlSeconds: Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ?? 604800),
      } satisfies AuthRuntimeConfig,
    }
  }
}
