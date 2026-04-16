export const AUTH_IS_PUBLIC_KEY = "auth:isPublic" as const
export const AUTH_ROLES_KEY = "auth:roles" as const
export const AUTH_TENANT_CONTEXT_KEY = "auth:tenantContext" as const

export const authTokenClaimKeys = {
  subject: "sub",
  email: "email",
  tenantId: "tenantId",
  membershipId: "membershipId",
  roles: "roles",
  permissions: "permissions",
} as const

export const membershipRoles = [
  "tenant_owner",
  "admin",
  "accountant",
  "auditor",
  "viewer",
] as const

export type MembershipRole = (typeof membershipRoles)[number]
