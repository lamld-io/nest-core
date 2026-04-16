import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common"
import { Public } from "../../../../libs/platform-auth/src/index.js"
import { AuditService, auditEventTypes } from "../../../../libs/platform-observability/src/index.js"
import { AuthService } from "./auth.service.js"
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js"
import { LocalAuthGuard } from "./guards/local-auth.guard.js"
import { LoginDto } from "./dto/login.dto.js"

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(
    @Body() _loginDto: LoginDto,
    @Req() request: {
      headers?: Record<string, unknown>
      requestId?: string
      user: Awaited<ReturnType<AuthService["validateUser"]>>
    }
  ) {
    this.auditService.record({
      type: auditEventTypes.authLoginSucceeded,
      service: "auth-service",
      requestId: request.requestId,
      outcome: "success",
      tenantId: request.user.tenantId,
      userId: request.user.id,
    })

    return this.authService.issueTokens(request.user)
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(
    @Req() request: {
      requestId?: string
      user: Parameters<AuthService["getProfileFromClaims"]>[0]
    }
  ) {
    this.auditService.record({
      type: auditEventTypes.authLoginSucceeded,
      service: "auth-service",
      requestId: request.requestId,
      outcome: "success",
      tenantId: request.user.tenantId,
      userId: request.user.sub,
      details: { endpoint: "auth.me" },
    })

    return this.authService.getProfileFromClaims(request.user)
  }
}
