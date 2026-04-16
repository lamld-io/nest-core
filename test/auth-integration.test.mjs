import test from "node:test"
import assert from "node:assert/strict"
import { Test } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { JwtModule, JwtService } from "@nestjs/jwt"
import { ValidationPipe } from "@nestjs/common"
import { AuditService } from "../dist/libs/platform-observability/src/index.js"

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

test("POST /auth/login validates payload and authenticates via repository-backed service", async () => {
  const { default: request } = await import("supertest")
  const { AuthService } = await import("../dist/apps/auth-service/src/auth/auth.service.js")
  const { AuthController } = await import("../dist/apps/auth-service/src/auth/auth.controller.js")
  const { AuthRepository } = await import("../dist/apps/auth-service/src/auth/auth.repository.js")
  const { JwtAuthGuard } = await import("../dist/apps/auth-service/src/auth/guards/jwt-auth.guard.js")
  const { JwtStrategy: AuthJwtStrategy } = await import(
    "../dist/apps/auth-service/src/auth/strategies/jwt.strategy.js"
  )
  const { LocalAuthGuard } = await import(
    "../dist/apps/auth-service/src/auth/guards/local-auth.guard.js"
  )

  const moduleRef = await Test.createTestingModule({
    imports: [JwtModule.register({ secret: authConfig.jwtSecret })],
    controllers: [AuthController],
    providers: [
      AuthService,
      AuthRepository,
      JwtService,
      JwtAuthGuard,
      AuthJwtStrategy,
      {
        provide: AuditService,
        useValue: { record: () => undefined },
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
      findByEmail: async (email) => (email === fixtureUser.email ? fixtureUser : null),
    })
    .overrideGuard(LocalAuthGuard)
    .useValue({
      canActivate: (context) => {
        const request = context.switchToHttp().getRequest()
        request.user = {
          id: fixtureUser.id,
          email: fixtureUser.email,
          tenantId: fixtureUser.tenantId,
          membershipId: fixtureUser.membershipId,
          roles: fixtureUser.roles,
          permissions: fixtureUser.permissions,
        }
        return true
      },
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context) => {
        const request = context.switchToHttp().getRequest()
        request.user = {
          sub: fixtureUser.id,
          email: fixtureUser.email,
          tenantId: fixtureUser.tenantId,
          membershipId: fixtureUser.membershipId,
          roles: fixtureUser.roles,
          permissions: fixtureUser.permissions,
          tokenUse: "access",
        }
        return true
      },
    })
    .compile()

  const app = moduleRef.createNestApplication()
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  )
  await app.init()

  await request(app.getHttpServer())
    .post("/auth/login")
    .send({ email: "not-an-email", password: "short" })
    .expect(400)

  await request(app.getHttpServer())
    .post("/auth/login")
    .send({ email: fixtureUser.email, password: "password123" })
    .expect(201)

  await app.close()
})

test("GET /auth/me rejects refresh token claims", async () => {
  const { default: request } = await import("supertest")
  const { AuthService } = await import("../dist/apps/auth-service/src/auth/auth.service.js")
  const { AuthController } = await import("../dist/apps/auth-service/src/auth/auth.controller.js")
  const { AuthRepository } = await import("../dist/apps/auth-service/src/auth/auth.repository.js")
  const { JwtAuthGuard } = await import("../dist/apps/auth-service/src/auth/guards/jwt-auth.guard.js")
  const { JwtStrategy: AuthJwtStrategy } = await import(
    "../dist/apps/auth-service/src/auth/strategies/jwt.strategy.js"
  )

  const moduleRef = await Test.createTestingModule({
    imports: [JwtModule.register({ secret: authConfig.jwtSecret })],
    controllers: [AuthController],
    providers: [
      AuthService,
      AuthRepository,
      JwtService,
      JwtAuthGuard,
      AuthJwtStrategy,
      {
        provide: AuditService,
        useValue: { record: () => undefined },
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
    .useValue({ findByEmail: async () => fixtureUser })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context) => {
        const request = context.switchToHttp().getRequest()
        request.user = {
          sub: fixtureUser.id,
          email: fixtureUser.email,
          tenantId: fixtureUser.tenantId,
          membershipId: fixtureUser.membershipId,
          roles: fixtureUser.roles,
          permissions: fixtureUser.permissions,
          tokenUse: "refresh",
        }
        return true
      },
    })
    .compile()

  const app = moduleRef.createNestApplication()
  await app.init()

  await request(app.getHttpServer()).get("/auth/me").expect(401)

  await app.close()
})

test("GET /membership/:userId rejects access to another user", async () => {
  const { default: request } = await import("supertest")
  const { MembershipController } = await import(
    "../dist/apps/user-service/src/membership/membership.controller.js"
  )
  const { MembershipService } = await import(
    "../dist/apps/user-service/src/membership/membership.service.js"
  )
  const { JwtAuthGuard: MembershipJwtAuthGuard } = await import(
    "../dist/apps/user-service/src/membership/guards/jwt-auth.guard.js"
  )

  const moduleRef = await Test.createTestingModule({
    controllers: [MembershipController],
    providers: [
      MembershipService,
      {
        provide: AuditService,
        useValue: { record: () => undefined },
      },
    ],
  })
    .overrideGuard(MembershipJwtAuthGuard)
    .useValue({
      canActivate: (context) => {
        const request = context.switchToHttp().getRequest()
        request.user = {
          userId: fixtureUser.id,
          email: fixtureUser.email,
          tenantId: fixtureUser.tenantId,
          membershipId: fixtureUser.membershipId,
          roles: fixtureUser.roles,
          permissions: fixtureUser.permissions,
        }
        return true
      },
    })
    .compile()

  const app = moduleRef.createNestApplication()
  await app.init()

  await request(app.getHttpServer()).get("/membership/user-2").expect(403)

  await app.close()
})
