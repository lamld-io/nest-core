import { Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"
import { ConfigModule, ConfigService } from "@nestjs/config"
import type { GatewayHardeningConfig } from "../../../../libs/platform-config/src/app-config.js"
import { PlatformObservabilityModule, AuditService } from "../../../../libs/platform-observability/src/index.js"
import { GatewayTimeoutInterceptor } from "../interceptors/gateway-timeout.interceptor.js"

@Module({
  imports: [ConfigModule, PlatformObservabilityModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      inject: [ConfigService, AuditService],
      useFactory: (configService: ConfigService, auditService: AuditService) => {
        const hardening = configService.getOrThrow<GatewayHardeningConfig>("gateway.hardening")
        return new GatewayTimeoutInterceptor(hardening.requestTimeoutMs, undefined, auditService)
      },
    },
  ],
})
export class GatewayHardeningModule {}
