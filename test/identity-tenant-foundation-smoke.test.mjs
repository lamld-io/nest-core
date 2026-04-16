import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("auth config requires JWT secret and defaults GraphQL IDE off", () => {
  const appConfig = fs.readFileSync("libs/platform-config/src/app-config.ts", "utf8")

  assert.match(appConfig, /AUTH_JWT_SECRET: Joi\.string\(\)\.min\(32\)\.required\(\)/)
  assert.match(appConfig, /throw new Error\("AUTH_JWT_SECRET is required"\)/)
  assert.match(appConfig, /GATEWAY_GRAPHQL_IDE_ENABLED: Joi\.boolean\(\)\.truthy\("true"\)\.falsy\("false"\)\.default\(false\)/)
})

test("auth-service exposes auth module, strategies, and controller", () => {
  const authModule = fs.readFileSync("apps/auth-service/src/auth/auth.module.ts", "utf8")
  const authController = fs.readFileSync("apps/auth-service/src/auth/auth.controller.ts", "utf8")
  const authService = fs.readFileSync("apps/auth-service/src/auth/auth.service.ts", "utf8")
  const authRepository = fs.readFileSync("apps/auth-service/src/auth/auth.repository.ts", "utf8")
  const localStrategy = fs.readFileSync("apps/auth-service/src/auth/strategies/local.strategy.ts", "utf8")
  const jwtStrategy = fs.readFileSync("apps/auth-service/src/auth/strategies/jwt.strategy.ts", "utf8")

  assert.match(authModule, /AuthService/)
  assert.match(authModule, /AuthRepository/)
  assert.match(authModule, /JwtAuthGuard/)
  assert.match(authController, /@Post\("login"\)/)
  assert.match(authController, /@UseGuards\(JwtAuthGuard\)/)
  assert.match(authService, /findByEmail/)
  assert.match(authService, /buildClaims\(user, "access"\)/)
  assert.match(authService, /buildClaims\(user, "refresh"\)/)
  assert.match(authService, /Access token required/)
  assert.match(authRepository, /findByEmail/)
  assert.match(localStrategy, /PassportStrategy\(Strategy\)/)
  assert.match(jwtStrategy, /ExtractJwt\.fromAuthHeaderAsBearerToken/)
  assert.match(jwtStrategy, /payload\.tokenUse !== "access"/)
})

test("user-service exposes membership projection boundary", () => {
  const membershipController = fs.readFileSync("apps/user-service/src/membership/membership.controller.ts", "utf8")
  const membershipModule = fs.readFileSync("apps/user-service/src/membership/membership.module.ts", "utf8")
  const membershipService = fs.readFileSync("apps/user-service/src/membership/membership.service.ts", "utf8")

  assert.match(membershipController, /@UseGuards\(JwtAuthGuard\)/)
  assert.match(membershipController, /ForbiddenException/)
  assert.match(membershipModule, /MembershipService/)
  assert.match(membershipService, /getMembershipByUserId/)
})

test("gateway exposes GraphQL auth integration and resolver", () => {
  const gatewayAuthModule = fs.readFileSync("apps/gateway/src/auth/gateway-auth.module.ts", "utf8")
  const gatewayResolver = fs.readFileSync("apps/gateway/src/auth/auth.resolver.ts", "utf8")
  const gqlGuard = fs.readFileSync("apps/gateway/src/auth/guards/gql-jwt-auth.guard.ts", "utf8")
  const graphqlModule = fs.readFileSync("apps/gateway/src/graphql/graphql.module.ts", "utf8")

  assert.match(gatewayAuthModule, /TenantRolesGuard/)
  assert.match(gatewayAuthModule, /JwtStrategy/)
  assert.match(gatewayResolver, /@UseGuards\(GqlJwtAuthGuard, TenantRolesGuard\)/)
  assert.match(gatewayResolver, /@Query\(\(\) => AuthContextView\)/)
  assert.match(gqlGuard, /PlatformJwtAuthGuard/)
  assert.match(graphqlModule, /process\.env\.NODE_ENV === "development"/)
})
