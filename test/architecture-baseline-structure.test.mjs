import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const requiredFiles = [
  "package.json",
  "nest-cli.json",
  "tsconfig.json",
  "tsconfig.build.json",
  "apps/gateway/src/main.ts",
  "apps/auth-service/src/main.ts",
  "apps/user-service/src/main.ts",
  "libs/platform-config/src/index.ts",
  "libs/platform-logger/src/index.ts",
  "libs/platform-observability/src/index.ts",
  "docs/architecture/adr-001-workspace-structure.md",
  "docs/architecture/adr-002-auth-and-tenant-model.md",
  "docs/architecture/adr-003-observability-baseline.md",
  "docs/architecture/adr-004-transport-and-eventing.md",
  "docs/architecture/adr-005-error-and-config-contracts.md",
]

test("architecture baseline files exist", () => {
  for (const filePath of requiredFiles) {
    assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`)
  }
})

test("workspace manifest defines baseline scripts and workspaces", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))

  assert.equal(packageJson.private, true)
  assert.deepEqual(packageJson.workspaces, ["apps/*", "libs/*"])
  assert.equal(typeof packageJson.scripts.build, "string")
  assert.equal(typeof packageJson.scripts.test, "string")
  assert.equal(typeof packageJson.scripts.lint, "string")
})

test("nest workspace includes baseline applications and libraries", () => {
  const nestCli = JSON.parse(fs.readFileSync("nest-cli.json", "utf8"))

  assert.equal(nestCli.monorepo, true)
  assert.equal(nestCli.projects.gateway.type, "application")
  assert.equal(nestCli.projects["auth-service"].type, "application")
  assert.equal(nestCli.projects["user-service"].type, "application")
  assert.equal(nestCli.projects["platform-config"].type, "library")
  assert.equal(nestCli.projects["platform-logger"].type, "library")
  assert.equal(nestCli.projects["platform-observability"].type, "library")
})

test("ADRs capture key architecture baseline decisions", () => {
  const authAdr = fs.readFileSync("docs/architecture/adr-002-auth-and-tenant-model.md", "utf8")
  const observabilityAdr = fs.readFileSync("docs/architecture/adr-003-observability-baseline.md", "utf8")
  const transportAdr = fs.readFileSync("docs/architecture/adr-004-transport-and-eventing.md", "utf8")

  assert.match(authAdr, /JWT access token \+ refresh token/)
  assert.match(authAdr, /tenant-scoped RBAC/)
  assert.match(observabilityAdr, /OpenTelemetry/)
  assert.match(observabilityAdr, /Loki/)
  assert.match(observabilityAdr, /Tempo/)
  assert.match(transportAdr, /NATS JetStream/)
  assert.match(transportAdr, /internal HTTP/)
})
