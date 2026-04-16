import { Module } from "@nestjs/common"
import { GatewayAuthModule } from "./auth/gateway-auth.module.js"
import { GatewayGraphqlModule } from "./graphql/graphql.module.js"
import { GatewayHealthModule } from "./health/health.module.js"
import { GatewayHardeningModule } from "./hardening/gateway-hardening.module.js"
import {
  platformAppConfig,
  PlatformConfigModule,
} from "../../../libs/platform-config/src/index.js"
import { PlatformLoggerModule } from "../../../libs/platform-logger/src/index.js"
import { PlatformObservabilityModule } from "../../../libs/platform-observability/src/index.js"

@Module({
  imports: [
    PlatformConfigModule.register(platformAppConfig.gateway),
    PlatformLoggerModule,
    PlatformObservabilityModule,
    GatewayAuthModule,
    GatewayHardeningModule,
    GatewayGraphqlModule,
    GatewayHealthModule,
  ],
})
export class AppModule {}
