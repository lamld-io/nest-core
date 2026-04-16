import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("gateway hardening source wiring is explicit", () => {
  const appConfig = fs.readFileSync("libs/platform-config/src/app-config.ts", "utf8")
  const appModule = fs.readFileSync("apps/gateway/src/app.module.ts", "utf8")
  const gatewayAuthModule = fs.readFileSync("apps/gateway/src/auth/gateway-auth.module.ts", "utf8")
  const graphqlModule = fs.readFileSync("apps/gateway/src/graphql/graphql.module.ts", "utf8")
  const auditEvents = fs.readFileSync("libs/platform-observability/src/audit-events.ts", "utf8")

  assert.match(appConfig, /export type GatewayHardeningConfig/)
  assert.match(appConfig, /GATEWAY_RATE_LIMIT_TTL_SECONDS/)
  assert.match(appConfig, /GATEWAY_RATE_LIMIT_LIMIT/)
  assert.match(appConfig, /GATEWAY_GRAPHQL_MAX_QUERY_DEPTH/)
  assert.match(appConfig, /GATEWAY_GRAPHQL_MAX_QUERY_COMPLEXITY/)
  assert.match(appConfig, /GATEWAY_GRAPHQL_MAX_QUERY_ALIASES/)
  assert.match(appConfig, /GATEWAY_REQUEST_TIMEOUT_MS/)
  assert.match(appConfig, /GATEWAY_GRAPHQL_INTROSPECTION_ENABLED/)
  assert.match(appConfig, /GATEWAY_GRAPHQL_PERSISTED_QUERY_MODE/)

  assert.match(appModule, /GatewayHardeningModule/)
  assert.match(gatewayAuthModule, /ThrottlerModule\.forRoot/)
  assert.match(gatewayAuthModule, /GqlThrottlerGuard/)
  assert.match(gatewayAuthModule, /APP_GUARD/)

  assert.match(graphqlModule, /validationRules:/)
  assert.match(graphqlModule, /buildGatewayValidationRules/)
  assert.match(graphqlModule, /resolvePersistedQueryPolicy/)
  assert.match(graphqlModule, /introspection:/)

  assert.match(auditEvents, /gateway\.rate_limited/)
  assert.match(auditEvents, /gateway\.query_rejected/)
  assert.match(auditEvents, /gateway\.request_timed_out/)
  assert.match(auditEvents, /gateway\.persisted_query_checked/)
})

test("gateway hardening support files exist without blanket GraphQL cache interceptor", () => {
  const queryValidation = fs.readFileSync("apps/gateway/src/graphql/graphql.module.ts", "utf8")
  const cachePolicy = fs.readFileSync("apps/gateway/src/cache/gateway-cache-policy.ts", "utf8")
  const timeoutInterceptor = fs.readFileSync(
    "apps/gateway/src/interceptors/gateway-timeout.interceptor.ts",
    "utf8"
  )

  assert.match(cachePolicy, /gatewayCacheBaseline/)
  assert.doesNotMatch(cachePolicy, /CacheInterceptor/)
  assert.match(timeoutInterceptor, /RequestTimeoutException/)
  assert.match(timeoutInterceptor, /timeout\(/)
  assert.match(queryValidation, /buildGatewayValidationRules/)
})
