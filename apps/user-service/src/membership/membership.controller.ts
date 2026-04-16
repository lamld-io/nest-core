import { Controller, ForbiddenException, Get, Param, Req, UseGuards } from "@nestjs/common"
import type { TenantRequestContext } from "../../../../libs/platform-auth/src/index.js"
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js"
import { MembershipService } from "./membership.service.js"

@Controller("membership")
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @UseGuards(JwtAuthGuard)
  @Get(":userId")
  getMembership(
    @Param("userId") userId: string,
    @Req() request: { user: TenantRequestContext }
  ) {
    if (request.user.userId !== userId) {
      throw new ForbiddenException("Forbidden")
    }

    return this.membershipService.getMembershipByUserId(userId)
  }
}
