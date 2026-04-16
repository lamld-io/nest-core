import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import type { AuthRuntimeConfig } from "../../../../libs/platform-config/src/app-config.js"
import { PlatformObservabilityModule } from "../../../../libs/platform-observability/src/index.js"
import { AuthController } from "./auth.controller.js"
import { AuthRepository } from "./auth.repository.js"
import { AuthService } from "./auth.service.js"
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js"
import { LocalAuthGuard } from "./guards/local-auth.guard.js"
import { JwtStrategy } from "./strategies/jwt.strategy.js"
import { LocalStrategy } from "./strategies/local.strategy.js"

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PlatformObservabilityModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.getOrThrow<AuthRuntimeConfig>("auth-service.auth")

        return {
          secret: authConfig.jwtSecret,
          signOptions: { expiresIn: authConfig.accessTokenTtlSeconds },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, JwtAuthGuard, LocalAuthGuard, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
