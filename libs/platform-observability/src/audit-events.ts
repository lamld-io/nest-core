export const auditEventTypes = {
  authLoginSucceeded: "auth.login_succeeded",
  authLoginFailed: "auth.login_failed",
  authAccessTokenRejected: "auth.access_token_rejected",
  membershipAccessDenied: "membership.access_denied",
  gatewayRateLimited: "gateway.rate_limited",
  gatewayQueryRejected: "gateway.query_rejected",
  gatewayRequestTimedOut: "gateway.request_timed_out",
  gatewayPersistedQueryChecked: "gateway.persisted_query_checked",
} as const

export type AuditEventType = (typeof auditEventTypes)[keyof typeof auditEventTypes]

export type AuditEvent = {
  type: AuditEventType
  service: string
  requestId?: string
  traceId?: string
  tenantId?: string
  userId?: string
  outcome: "success" | "failure"
  details?: Record<string, string | number | boolean | undefined>
}
