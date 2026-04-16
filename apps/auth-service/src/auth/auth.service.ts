import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"
import type { AuthTokenClaims } from "../../../../libs/platform-auth/src/index.js"
import { AuditService, auditEventTypes } from "../../../../libs/platform-observability/src/index.js"
import { AuthRepository } from "./auth.repository.js"
import type { AuthenticatedUser } from "./auth.types.js"
import type { TokenResponseDto } from "./dto/token-response.dto.js"

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async validateUser(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.authRepository.findByEmail(email)

    if (!user || password !== user.passwordHash) {
      this.auditService.record({
        type: auditEventTypes.authLoginFailed,
        service: "auth-service",
        outcome: "failure",
        details: { email },
      })
      throw new UnauthorizedException("Invalid credentials")
    }

    const { passwordHash: _passwordHash, ...authenticatedUser } = user
    return authenticatedUser
  }

  buildClaims(user: AuthenticatedUser, tokenUse: AuthTokenClaims["tokenUse"]): AuthTokenClaims {
    return {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      membershipId: user.membershipId,
      roles: user.roles,
      permissions: user.permissions,
      tokenUse,
    }
  }

  issueTokens(user: AuthenticatedUser): TokenResponseDto {
    const authConfig = this.configService.getOrThrow<{
      jwtSecret: string
      accessTokenTtlSeconds: number
      refreshTokenTtlSeconds: number
    }>("auth-service.auth")

    const accessClaims = this.buildClaims(user, "access")
    const refreshClaims = this.buildClaims(user, "refresh")

    return {
      accessToken: this.jwtService.sign(accessClaims, {
        secret: authConfig.jwtSecret,
        expiresIn: authConfig.accessTokenTtlSeconds,
      }),
      refreshToken: this.jwtService.sign(refreshClaims, {
        secret: authConfig.jwtSecret,
        expiresIn: authConfig.refreshTokenTtlSeconds,
      }),
      tokenType: "Bearer",
    }
  }

  getProfileFromClaims(claims: AuthTokenClaims): AuthenticatedUser {
    if (claims.tokenUse !== "access") {
      this.auditService.record({
        type: auditEventTypes.authAccessTokenRejected,
        service: "auth-service",
        outcome: "failure",
        tenantId: claims.tenantId,
        userId: claims.sub,
      })
      throw new UnauthorizedException("Access token required")
    }

    return {
      id: claims.sub,
      email: claims.email,
      tenantId: claims.tenantId,
      membershipId: claims.membershipId,
      roles: claims.roles,
      permissions: claims.permissions,
    }
  }
}
