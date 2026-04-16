import test from "node:test"
import assert from "node:assert/strict"
import { Test } from "@nestjs/testing"

process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "0123456789abcdef0123456789abcdef"

test("gateway AppModule compiles", async () => {
  const { AppModule } = await import("../dist/apps/gateway/src/app.module.js")
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  assert.ok(moduleRef)
})

test("auth-service AppModule compiles", async () => {
  const { AppModule } = await import("../dist/apps/auth-service/src/app.module.js")
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  assert.ok(moduleRef)
})

test("user-service AppModule compiles", async () => {
  const { AppModule } = await import("../dist/apps/user-service/src/app.module.js")
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  assert.ok(moduleRef)
})
