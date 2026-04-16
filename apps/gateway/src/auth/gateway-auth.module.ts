import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { ConfigModule } from "@nestjs/config"
import { PassportModule } from "@nestjs/passport"
import { ConfigService } from "@nestjs/config"
import { ThrottlerModule } from "@nestjs/throttler"
import type { GatewayHardeningConfig } from "../../../../libs/platform-config/src/app-config.js"
import { TenantRolesGuard } from "../../../../libs/platform-auth/src/index.js"
import { AuthResolver } from "./auth.resolver.js"
import { GqlJwtAuthGuard } from "./guards/gql-jwt-auth.guard.js"
import { GqlThrottlerGuard } from "./guards/gql-throttler.guard.js"
import { JwtStrategy } from "./strategies/jwt.strategy.js"

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const hardening = configService.getOrThrow<GatewayHardeningConfig>("gateway.hardening")

        return {
          throttlers: [
            {
              name: "gateway",
              ttl: hardening.rateLimit.ttlSeconds * 1000,
              limit: hardening.rateLimit.limit,
            },
          ],
        }
      },
    }),
  ],
  providers: [
    AuthResolver,
    GqlJwtAuthGuard,
    GqlThrottlerGuard,
    JwtStrategy,
    TenantRolesGuard,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
  exports: [GqlJwtAuthGuard],
})
export class GatewayAuthModule {}
