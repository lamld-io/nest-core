import test from "node:test"
import assert from "node:assert/strict"
import { parse, validate, buildSchema } from "graphql"
import { of, lastValueFrom } from "rxjs"
import { delay } from "rxjs/operators"

process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "0123456789abcdef0123456789abcdef"
process.env.NODE_ENV = process.env.NODE_ENV ?? "test"

test("gateway config exposes production-safe hardening defaults", async () => {
  const { createPlatformConfigNamespace, platformAppConfig } = await import(
    "../dist/libs/platform-config/src/app-config.js"
  )

  process.env.GATEWAY_RATE_LIMIT_TTL_SECONDS = "30"
  process.env.GATEWAY_RATE_LIMIT_LIMIT = "2"
  process.env.GATEWAY_GRAPHQL_MAX_QUERY_DEPTH = "4"
  process.env.GATEWAY_GRAPHQL_MAX_QUERY_COMPLEXITY = "6"
  process.env.GATEWAY_GRAPHQL_MAX_QUERY_ALIASES = "2"
  process.env.GATEWAY_REQUEST_TIMEOUT_MS = "25"
  process.env.GATEWAY_GRAPHQL_INTROSPECTION_ENABLED = "false"
  process.env.GATEWAY_GRAPHQL_PERSISTED_QUERY_MODE = "none"

  const config = createPlatformConfigNamespace(platformAppConfig.gateway)()

  assert.equal(config.hardening.rateLimit.ttlSeconds, 30)
  assert.equal(config.hardening.rateLimit.limit, 2)
  assert.equal(config.hardening.graphql.maxDepth, 4)
  assert.equal(config.hardening.graphql.maxComplexity, 6)
  assert.equal(config.hardening.graphql.maxAliases, 2)
  assert.equal(config.hardening.requestTimeoutMs, 25)
  assert.equal(config.hardening.graphql.introspectionEnabled, false)
  assert.equal(config.hardening.graphql.persistedQueryMode, "none")
})

test("persisted query policy stays explicit and security-aware", async () => {
  const {
    resolvePersistedQueryPolicy,
    assertTrustedDocumentRequest,
    createTrustedDocumentsPlugin,
  } = await import(
    "../dist/apps/gateway/src/graphql/persisted-queries.js"
  )

  assert.deepEqual(resolvePersistedQueryPolicy("none"), {
    mode: "none",
    persistedQueries: false,
    enforceTrustedDocuments: false,
  })

  assert.equal(resolvePersistedQueryPolicy("trusted-documents").enforceTrustedDocuments, true)

  assert.throws(
    () =>
      assertTrustedDocumentRequest(
        {
          query: "query Dynamic { me { id } }",
        },
        resolvePersistedQueryPolicy("trusted-documents"),
        new Set(["known-hash"])
      ),
    /Only trusted persisted queries are allowed/
  )

  assert.doesNotThrow(() =>
    assertTrustedDocumentRequest(
      {
        extensions: {
          persistedQuery: {
            sha256Hash: "known-hash",
          },
        },
      },
      resolvePersistedQueryPolicy("trusted-documents"),
      new Set(["known-hash"])
    )
  )

  const plugin = createTrustedDocumentsPlugin(
    resolvePersistedQueryPolicy("trusted-documents"),
    new Set(["known-hash"])
  )
  const requestListener = await plugin.requestDidStart()

  await assert.rejects(
    () =>
      requestListener.didResolveOperation({
        request: {
          query: "query Dynamic { me { id } }",
        },
      }),
    /Only trusted persisted queries are allowed/
  )
})

test("gateway validation helpers expose depth and breadth controls", async () => {
  const { buildGatewayValidationRules } = await import(
    "../dist/apps/gateway/src/graphql/query-validation.js"
  )

  const validationRules = buildGatewayValidationRules({
    maxDepth: 4,
    maxComplexity: 6,
    maxAliases: 2,
  })

  assert.equal(Array.isArray(validationRules), true)
  assert.equal(validationRules.length >= 2, true)
})

test("gateway validation rejects queries that exceed depth, complexity, and aliases", async () => {
  const { buildGatewayValidationRules } = await import(
    "../dist/apps/gateway/src/graphql/query-validation.js"
  )

  const schema = buildSchema(`
    type Query {
      me: User
      account: User
    }

    type User {
      id: ID!
      profile: Profile
    }

    type Profile {
      id: ID!
      details: Detail
    }

    type Detail {
      id: ID!
    }
  `)

  const tooDeepDocument = parse(`
    query TooDeep {
      me {
        profile {
          details {
            id
          }
        }
      }
    }
  `)

  const tooBroadDocument = parse(`
    query TooBroad {
      first: me { id }
      second: account { id }
      third: me { id }
    }
  `)

  const rules = buildGatewayValidationRules({
    maxDepth: 2,
    maxComplexity: 2,
    maxAliases: 1,
  })

  const depthErrors = validate(schema, tooDeepDocument, rules)
  assert.equal(depthErrors.some((error) => error.message.includes("depth 4 exceeds maximum allowed depth 2")), true)
  assert.equal(
    depthErrors.some((error) => error.message.includes("complexity 4 exceeds maximum allowed complexity 2")),
    true
  )

  const breadthErrors = validate(schema, tooBroadDocument, rules)
  assert.equal(
    breadthErrors.some((error) => error.message.includes("complexity 6 exceeds maximum allowed complexity 2")),
    true
  )
  assert.equal(
    breadthErrors.some((error) => error.message.includes("aliases 3 exceed maximum allowed aliases 1")),
    true
  )
})

test("gateway validation skips the introspection root field but still constrains nested selections", async () => {
  const { buildGatewayValidationRules } = await import(
    "../dist/apps/gateway/src/graphql/query-validation.js"
  )

  const schema = buildSchema(`
    type Query {
      me: User
    }

    type User {
      id: ID!
    }
  `)

  const introspectionDocument = parse(`
    query IntrospectionOnly {
      __schema {
        queryType {
          name
        }
      }
    }
  `)

  const errors = validate(
    schema,
    introspectionDocument,
    buildGatewayValidationRules({ maxDepth: 0, maxComplexity: 0, maxAliases: 0 })
  )

  assert.equal(errors.some((error) => error.message.includes("depth 2 exceeds maximum allowed depth 0")), true)
  assert.equal(
    errors.some((error) => error.message.includes("complexity 2 exceeds maximum allowed complexity 0")),
    true
  )
})

test("timeout interceptor turns slow operations into request timeout errors", async () => {
  const { RequestTimeoutException } = await import("@nestjs/common")
  const { GatewayTimeoutInterceptor } = await import(
    "../dist/apps/gateway/src/interceptors/gateway-timeout.interceptor.js"
  )

  const interceptor = new GatewayTimeoutInterceptor(5)
  const context = {
    getType: () => "http",
    getHandler: () => ({ name: "execute" }),
    getClass: () => ({ name: "GatewayController" }),
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
    }),
  }
  const next = {
    handle: () => of("slow").pipe(delay(20)),
  }

  await assert.rejects(() => lastValueFrom(interceptor.intercept(context, next)), RequestTimeoutException)
})

test("timeout interceptor passes through successful responses without remapping", async () => {
  const { GatewayTimeoutInterceptor } = await import(
    "../dist/apps/gateway/src/interceptors/gateway-timeout.interceptor.js"
  )

  const interceptor = new GatewayTimeoutInterceptor(25)
  const context = {
    getType: () => "http",
    getHandler: () => ({ name: "execute" }),
    getClass: () => ({ name: "GatewayController" }),
    switchToHttp: () => ({
      getRequest: () => ({ headers: { "x-request-id": "req-1" } }),
    }),
  }
  const next = {
    handle: () => of("ok"),
  }

  const result = await lastValueFrom(interceptor.intercept(context, next))
  assert.equal(result, "ok")
})

test("timeout interceptor uses GraphQL request context for timeout auditing", async () => {
  const { RequestTimeoutException } = await import("@nestjs/common")
  const graphqlModule = await import("@nestjs/graphql")
  const { GatewayTimeoutInterceptor } = await import(
    "../dist/apps/gateway/src/interceptors/gateway-timeout.interceptor.js"
  )

  const auditEvents = []
  const originalCreate = graphqlModule.GqlExecutionContext.create

  graphqlModule.GqlExecutionContext.create = () => ({
    getContext: () => ({
      req: {
        headers: {
          "x-request-id": "graphql-req",
          traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        },
      },
    }),
  })

  try {
    const interceptor = new GatewayTimeoutInterceptor(5, undefined, {
      record: (event) => auditEvents.push(event),
    })
    const context = {
      getType: () => "graphql",
      getHandler: () => ({ name: "currentUser" }),
      getClass: () => ({ name: "Resolver" }),
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    }
    const next = {
      handle: () => of("slow").pipe(delay(20)),
    }

    await assert.rejects(() => lastValueFrom(interceptor.intercept(context, next)), RequestTimeoutException)
    assert.equal(auditEvents.length, 1)
    assert.equal(auditEvents[0].details.operationName, "graphql.currentUser")
    assert.equal(auditEvents[0].details.timeoutMs, 5)
    assert.equal(auditEvents[0].requestId, "graphql-req")
  } finally {
    graphqlModule.GqlExecutionContext.create = originalCreate
  }
})

test("GraphQL throttler guard extracts GraphQL context and prefers socket address for tracking", async () => {
  const graphqlModule = await import("@nestjs/graphql")
  const { GqlThrottlerGuard } = await import(
    "../dist/apps/gateway/src/auth/guards/gql-throttler.guard.js"
  )

  const originalCreate = graphqlModule.GqlExecutionContext.create

  graphqlModule.GqlExecutionContext.create = () => ({
    getContext: () => ({
      req: {
        headers: {
          "x-forwarded-for": "203.0.113.7, 198.51.100.10",
        },
        socket: { remoteAddress: "198.51.100.9" },
        res: { statusCode: 200 },
      },
    }),
  })

  try {
    const guard = new GqlThrottlerGuard()
    const requestResponse = guard.getRequestResponse({
      getType: () => "graphql",
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    })

    assert.equal(requestResponse.req.headers["x-forwarded-for"], "203.0.113.7, 198.51.100.10")
    assert.equal(requestResponse.res.statusCode, 200)
    assert.equal(await guard.getTracker(requestResponse.req), "198.51.100.9")
  } finally {
    graphqlModule.GqlExecutionContext.create = originalCreate
  }
})

test("GraphQL throttler guard falls back to http request ip when forwarded headers are absent", async () => {
  const { GqlThrottlerGuard } = await import(
    "../dist/apps/gateway/src/auth/guards/gql-throttler.guard.js"
  )

  const guard = new GqlThrottlerGuard()
  const requestResponse = guard.getRequestResponse({
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => ({ ip: "198.51.100.11" }),
      getResponse: () => ({ statusCode: 204 }),
    }),
  })

  assert.equal(requestResponse.req.ip, "198.51.100.11")
  assert.equal(requestResponse.res.statusCode, 204)
  assert.equal(await guard.getTracker(requestResponse.req), "198.51.100.11")
  assert.equal(await guard.getTracker({ ips: ["198.51.100.12"] }), "198.51.100.12")
  assert.equal(await guard.getTracker({}), "unknown")
})
