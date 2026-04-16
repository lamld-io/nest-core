import type { AuthTokenClaims } from "../../../../libs/platform-auth/src/index.js"

export type AuthRecord = {
  id: string
  email: string
  passwordHash: string
  tenantId: string
  membershipId: string
  roles: AuthTokenClaims["roles"]
  permissions: AuthTokenClaims["permissions"]
}

export type AuthenticatedUser = Omit<AuthRecord, "passwordHash">
