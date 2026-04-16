import type { MembershipRole } from "./constants.js"

export type TenantPermission =
  | "tenant.manage"
  | "membership.read"
  | "membership.write"
  | "auth.login"

export type AuthTokenUse = "access" | "refresh"

export type AuthTokenClaims = {
  sub: string
  email: string
  tenantId: string
  membershipId: string
  roles: MembershipRole[]
  permissions: TenantPermission[]
  tokenUse: AuthTokenUse
}

export type TenantRequestContext = {
  userId: string
  email: string
  tenantId: string
  membershipId: string
  roles: MembershipRole[]
  permissions: TenantPermission[]
}
