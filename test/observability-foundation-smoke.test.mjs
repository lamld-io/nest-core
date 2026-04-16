import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("observability config and modules are wired", () => {
  const appConfig = fs.readFileSync("libs/platform-config/src/app-config.ts", "utf8")
  const loggerIndex = fs.readFileSync("libs/platform-logger/src/index.ts", "utf8")
  const observabilityIndex = fs.readFileSync("libs/platform-observability/src/index.ts", "utf8")
  const metrics = fs.readFileSync("libs/platform-observability/src/metrics.ts", "utf8")

  assert.match(appConfig, /OBS_METRICS_PATH/)
  assert.match(appConfig, /OBS_AUDIT_ENABLED/)
  assert.match(loggerIndex, /RequestLoggingInterceptor/)
  assert.match(observabilityIndex, /AuditService/)
  assert.match(metrics, /nest_core_requests_total/)
})

test("auth and membership flows emit audit events", () => {
  const authController = fs.readFileSync("apps/auth-service/src/auth/auth.controller.ts", "utf8")
  const authService = fs.readFileSync("apps/auth-service/src/auth/auth.service.ts", "utf8")
  const membershipController = fs.readFileSync("apps/user-service/src/membership/membership.controller.ts", "utf8")

  assert.match(authController, /auditEventTypes\.authLoginSucceeded/)
  assert.match(authService, /auditEventTypes\.authLoginFailed/)
  assert.match(authService, /auditEventTypes\.authAccessTokenRejected/)
  assert.match(membershipController, /auditEventTypes\.membershipAccessDenied/)
})
