import { Module } from "@nestjs/common"
import type { DynamicModule } from "@nestjs/common"
import { ConfigModule, registerAs } from "@nestjs/config"
import {
  createPlatformConfigNamespace,
  platformAppConfig,
  sharedEnvironmentValidationSchema,
  type PlatformAppConfigDefinition,
} from "./app-config.js"

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

@Module({})
export class PlatformConfigModule {
  static register(definition: PlatformAppConfigDefinition): DynamicModule {
    const namespace = registerAs(definition.name, createPlatformConfigNamespace(definition))

    return {
      module: PlatformConfigModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          envFilePath: [...platformConfigBaseline.envFiles],
          load: [namespace],
          validationSchema: sharedEnvironmentValidationSchema,
        }),
      ],
      exports: [ConfigModule],
    }
  }
}

export { platformAppConfig }
