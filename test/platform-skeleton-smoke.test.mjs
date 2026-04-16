import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("gateway has graphql and health modules wired", () => {
  const appModule = fs.readFileSync("apps/gateway/src/app.module.ts", "utf8")
  const graphqlModule = fs.readFileSync("apps/gateway/src/graphql/graphql.module.ts", "utf8")

  assert.match(appModule, /GatewayGraphqlModule/)
  assert.match(appModule, /GatewayHealthModule/)
  assert.match(graphqlModule, /GraphQLModule\.forRootAsync/)
  assert.match(graphqlModule, /ApolloDriver/)
})

test("all services have app modules and health modules", () => {
  const authMain = fs.readFileSync("apps/auth-service/src/main.ts", "utf8")
  const userMain = fs.readFileSync("apps/user-service/src/main.ts", "utf8")
  const authHealth = fs.readFileSync("apps/auth-service/src/health/health.module.ts", "utf8")
  const userHealth = fs.readFileSync("apps/user-service/src/health/health.module.ts", "utf8")

  assert.match(authMain, /NestFactory\.create/)
  assert.match(userMain, /NestFactory\.create/)
  assert.match(authHealth, /@Controller\("health"\)/)
  assert.match(userHealth, /@Controller\("health"\)/)
})

test("shared platform libs expose scaffold surfaces", () => {
  const configIndex = fs.readFileSync("libs/platform-config/src/index.ts", "utf8")
  const loggerIndex = fs.readFileSync("libs/platform-logger/src/index.ts", "utf8")
  const observabilityIndex = fs.readFileSync("libs/platform-observability/src/index.ts", "utf8")
  const authIndex = fs.readFileSync("libs/platform-auth/src/index.ts", "utf8")

  assert.match(configIndex, /class PlatformConfigModule/)
  assert.match(loggerIndex, /class PlatformLoggerModule/)
  assert.match(observabilityIndex, /class PlatformObservabilityModule/)
  assert.match(authIndex, /auth\.decorators/)
})
