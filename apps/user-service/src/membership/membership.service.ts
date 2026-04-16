import { Injectable, NotFoundException } from "@nestjs/common"
import type { MembershipProjection } from "./membership.types.js"

const membershipFixtures: MembershipProjection[] = [
  {
    userId: "user-1",
    email: "owner@example.com",
    tenantId: "tenant-1",
    membershipId: "membership-1",
    roles: ["tenant_owner"],
    permissions: ["tenant.manage", "membership.read", "membership.write", "auth.login"],
  },
  {
    userId: "user-2",
    email: "accountant@example.com",
    tenantId: "tenant-1",
    membershipId: "membership-2",
    roles: ["accountant"],
    permissions: ["membership.read", "auth.login"],
  },
]

@Injectable()
export class MembershipService {
  getMembershipByUserId(userId: string): MembershipProjection {
    const membership = membershipFixtures.find((entry) => entry.userId === userId)

    if (!membership) {
      throw new NotFoundException("Membership not found")
    }

    return membership
  }
}
