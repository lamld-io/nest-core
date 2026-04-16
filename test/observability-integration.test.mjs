import test from "node:test"
import assert from "node:assert/strict"
import { Test } from "@nestjs/testing"
import { ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtModule, JwtService } from "@nestjs/jwt"
import { AuditService, platformAuditCounter, renderPlatformMetrics } from "../dist/libs/platform-observability/src/index.js"

const authConfig = {
  jwtSecret: "0123456789abcdef0123456789abcdef",
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 604800,
}

const fixtureUser = {
  id: "user-1",
  email: "owner@example.com",
  passwordHash: "password123",
  tenantId: "tenant-1",
  membershipId: "membership-1",
  roles: ["tenant_owner"],
  permissions: ["tenant.manage", "membership.read", "membership.write", "auth.login"],
}

test("metrics registry exposes request and audit counters", async () => {
  const metrics = await renderPlatformMetrics()

  assert.match(metrics, /nest_core_requests_total/)
  assert.match(metrics, /nest_core_audit_events_total/)
})

test("login failure emits audit metric signal", async () => {
  const { AuthService } = await import("../dist/apps/auth-service/src/auth/auth.service.js")
  const { AuthRepository } = await import("../dist/apps/auth-service/src/auth/auth.repository.js")

  const auditEvents = []

  const moduleRef = await Test.createTestingModule({
    imports: [JwtModule.register({ secret: authConfig.jwtSecret })],
    providers: [
      AuthService,
      AuthRepository,
      JwtService,
      {
        provide: AuditService,
        useValue: { record: (event) => auditEvents.push(event) },
      },
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: () => authConfig,
        },
      },
    ],
  })
    .overrideProvider(AuthRepository)
    .useValue({
      findByEmail: async () => fixtureUser,
    })
    .compile()

  const authService = moduleRef.get(AuthService)

  await assert.rejects(
    () => authService.validateUser(fixtureUser.email, "wrongpass123"),
    /Invalid credentials/
  )

  assert.equal(auditEvents.length, 1)
  assert.equal(auditEvents[0].type, "auth.login_failed")
})

test("membership denial increments audit counter path", async () => {
  const before = await renderPlatformMetrics()

  platformAuditCounter.inc({
    service: "user-service",
    eventType: "membership.access_denied",
    outcome: "failure",
  })

  const after = await renderPlatformMetrics()
  assert.notEqual(before, after)
  assert.match(after, /membership\.access_denied/)
})
