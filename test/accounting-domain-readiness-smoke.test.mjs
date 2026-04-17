import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("accounting readiness artifacts exist", () => {
  const requiredFiles = [
    "docs/architecture/adr-006-accounting-domain-boundaries.md",
    "docs/architecture/accounting-domain-map.md",
    "docs/contracts/accounting-service-expansion.md",
  ]

  for (const filePath of requiredFiles) {
    assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`)
  }
})

test("accounting domain boundary ADR preserves platform constraints", () => {
  const adr = fs.readFileSync("docs/architecture/adr-006-accounting-domain-boundaries.md", "utf8")

  assert.match(adr, /ledger/)
  assert.match(adr, /invoice/)
  assert.match(adr, /expense/)
  assert.match(adr, /tax/)
  assert.match(adr, /reporting/)
  assert.match(adr, /GraphQL Gateway/)
  assert.match(adr, /tenant-scoped RBAC/)
  assert.match(adr, /orchestration/i)
})

test("accounting domain map defines ownership and rollout order", () => {
  const domainMap = fs.readFileSync("docs/architecture/accounting-domain-map.md", "utf8")

  assert.match(domainMap, /Owned data concepts/)
  assert.match(domainMap, /Forbidden responsibilities/)
  assert.match(domainMap, /Recommended rollout order/)
  assert.match(domainMap, /reporting/i)
})

test("accounting service expansion contract preserves transport and metadata rules", () => {
  const contract = fs.readFileSync("docs/contracts/accounting-service-expansion.md", "utf8")

  assert.match(contract, /internal HTTP/)
  assert.match(contract, /NATS JetStream/)
  assert.match(contract, /requestId/)
  assert.match(contract, /traceId/)
  assert.match(contract, /tenantId/)
  assert.match(contract, /version/i)
  assert.match(contract, /must not trust tenant input from client/i)
})
