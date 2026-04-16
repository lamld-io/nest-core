import { Controller, ForbiddenException, Get, Param, Req, UseGuards } from "@nestjs/common"
import type { TenantRequestContext } from "../../../../libs/platform-auth/src/index.js"
import { AuditService, auditEventTypes } from "../../../../libs/platform-observability/src/index.js"
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js"
import { MembershipService } from "./membership.service.js"

@Controller("membership")
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly auditService: AuditService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get(":userId")
  getMembership(
    @Param("userId") userId: string,
    @Req() request: { requestId?: string; user: TenantRequestContext }
  ) {
    if (request.user.userId !== userId) {
      this.auditService.record({
        type: auditEventTypes.membershipAccessDenied,
        service: "user-service",
        requestId: request.requestId,
        outcome: "failure",
        tenantId: request.user.tenantId,
        userId: request.user.userId,
        details: { targetUserId: userId },
      })
      throw new ForbiddenException("Forbidden")
    }

    return this.membershipService.getMembershipByUserId(userId)
  }
}
