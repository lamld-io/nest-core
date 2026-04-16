import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PassportModule } from "@nestjs/passport"
import { PlatformObservabilityModule } from "../../../../libs/platform-observability/src/index.js"
import { MembershipController } from "./membership.controller.js"
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js"
import { MembershipService } from "./membership.service.js"
import { JwtStrategy } from "./strategies/jwt.strategy.js"

@Module({
  imports: [ConfigModule, PassportModule, PlatformObservabilityModule],
  controllers: [MembershipController],
  providers: [MembershipService, JwtAuthGuard, JwtStrategy],
  exports: [MembershipService],
})
export class MembershipModule {}
