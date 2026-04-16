import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PassportModule } from "@nestjs/passport"
import { TenantRolesGuard } from "../../../../libs/platform-auth/src/index.js"
import { AuthResolver } from "./auth.resolver.js"
import { GqlJwtAuthGuard } from "./guards/gql-jwt-auth.guard.js"
import { JwtStrategy } from "./strategies/jwt.strategy.js"

@Module({
  imports: [ConfigModule, PassportModule],
  providers: [AuthResolver, GqlJwtAuthGuard, JwtStrategy, TenantRolesGuard],
  exports: [GqlJwtAuthGuard],
})
export class GatewayAuthModule {}
