import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import type { AuthRuntimeConfig } from "../../../../../libs/platform-config/src/app-config.js"
import type { AuthTokenClaims, TenantRequestContext } from "../../../../../libs/platform-auth/src/index.js"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const authConfig = configService.getOrThrow<AuthRuntimeConfig>("gateway.auth")

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.jwtSecret,
    })
  }

  validate(payload: AuthTokenClaims): TenantRequestContext {
    if (payload.tokenUse !== "access") {
      throw new UnauthorizedException("Access token required")
    }

    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      membershipId: payload.membershipId,
      roles: payload.roles,
      permissions: payload.permissions,
    }
  }
}
