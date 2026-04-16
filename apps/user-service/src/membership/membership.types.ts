import type { MembershipRole, TenantPermission } from "../../../../libs/platform-auth/src/index.js"

export type MembershipProjection = {
  userId: string
  email: string
  tenantId: string
  membershipId: string
  roles: MembershipRole[]
  permissions: TenantPermission[]
}
