# Plan: Gateway Hardening

## Summary
Phase `Gateway Hardening` sẽ biến GraphQL gateway từ mức “foundation chạy được” sang mức “production pilot-safe” bằng cách thêm rate limiting, GraphQL demand control, timeout/resilience guards, và caching/persisted-query baselines. Mục tiêu là bảo vệ gateway khỏi abuse và request cost bất thường mà không phá vỡ auth, observability, hay cấu trúc module đã hoàn tất ở các phase trước.

## User Story
As a platform engineering team, I want the GraphQL gateway to enforce rate limits, request cost controls, and safe runtime boundaries, so that the system can handle production pilot traffic without obvious abuse or reliability gaps.

## Problem → Solution
Gateway hiện đã có auth, observability, metrics, và audit foundation, nhưng vẫn thiếu các control vận hành cốt lõi như rate limiting, query depth/complexity checks, persisted-query policy, timeout handling, và cache strategy -> thêm hardening controls đúng tại gateway layer, cùng test và config tương ứng, để gateway đạt mức baseline security/reliability phù hợp với production pilot.

## Metadata
- **Complexity**: XL
- **Source PRD**: `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`
- **PRD Phase**: Gateway Hardening
- **Estimated Files**: 18

---

## UX Design

### Before
N/A — internal change

### After
N/A — internal change

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| GraphQL public request | Không có rate limit hoặc demand control | Có rate limit và query validation rõ ràng | Giảm abuse path |
| Query shape validation | Query sâu/rộng bất thường có thể đi qua | Query depth/complexity vượt chuẩn bị reject sớm | Operator-facing safety improvement |
| Gateway resilience | Request có thể chờ lâu nếu downstream treo | Có timeout/failure mapping baseline | Giảm treo request |
| First-party query flow | Chưa có persisted/trusted strategy | Có baseline persisted query/trusted-doc decision point | Chuẩn bị cho pilot clients |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | 175-189 | Defines gateway hardening goal, scope, and success signal |
| P0 (critical) | `.claude/PRPs/reports/observability-audit-foundation-report.md` | 1-108 | Current runtime state after phase 4; hardening must build on this, not duplicate it |
| P0 (critical) | `apps/gateway/src/main.ts` | 1-39 | Current global bootstrap, pipes, logger, interceptors |
| P0 (critical) | `apps/gateway/src/graphql/graphql.module.ts` | 1-32 | Current GraphQL configuration and request context injection point |
| P0 (critical) | `apps/gateway/src/auth/gateway-auth.module.ts` | 1-14 | Current auth/rate-limiting guard registration boundary |
| P0 (critical) | `apps/gateway/src/app.module.ts` | 1-22 | Current gateway composition root |
| P1 (important) | `libs/platform-config/src/app-config.ts` | 43-95 | Existing config strategy to extend with hardening settings |
| P1 (important) | `libs/platform-observability/src/request-context.ts` | 1-21 | Existing correlation helper that hardening errors/limits should reuse |
| P1 (important) | `libs/platform-observability/src/request-logging.interceptor.ts` | 1-46 | Existing request logging path that should log hardening outcomes |
| P1 (important) | `libs/platform-auth/src/auth.guard.ts` | 1-17 | Existing GraphQL auth guard base to mirror for throttling guards |
| P1 (important) | `test/app-module-compile.test.mjs` | 1-21 | Runtime compile smoke pattern to preserve |
| P1 (important) | `test/auth-integration.test.mjs` | 1-219 | Current integration-style tests against compiled artifacts |
| P1 (important) | `test/observability-integration.test.mjs` | 1-85 | Current integration tests and observability expectations |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| NestJS rate limiting | `docs.nestjs.com/security/rate-limiting` | Use `@nestjs/throttler`; for GraphQL, extend `ThrottlerGuard` via `GqlExecutionContext` and avoid in-memory-only assumptions for scaled runtime |
| GraphQL demand controls | `graphql.org/learn/security/` and `graphql-js.org/docs/operation-complexity-controls/` | Use layered controls: depth + breadth/complexity + pagination; trusted documents are preferred over runtime-only complexity checks |
| Persisted query strategy | Apollo APQ + GraphQL trusted documents guidance | APQ is performance-focused; trusted/safelisted documents are the actual security boundary |
| Timeout / resilience | Nest HTTP module + interceptors docs | Configure outbound timeouts and add gateway timeout/failure mapping interceptors |
| GraphQL caching | Nest caching docs + Apollo caching docs | Do not rely on Nest `CacheInterceptor` for GraphQL response caching; prefer explicit/manual cache or schema-aware caching policy |

---

## Patterns to Mirror

### NAMING_CONVENTION
// SOURCE: `libs/platform-config/src/app-config.ts:17-23`, `libs/platform-observability/src/index.ts:22-28`, `libs/platform-auth/src/constants.ts:1-20`
```ts
export type ObservabilityRuntimeConfig = {
  serviceName: string
  metricsPath: string
  metricsPrefix: string
  auditEnabled: boolean
  tracingEnabled: boolean
}
```

```ts
export const platformObservabilityBaseline = {
  traceBootstrapOrder: "before-app-bootstrap",
  metricsBackend: "prometheus",
  logBackend: "loki",
  traceBackend: "tempo",
  dashboardScope: ["gateway", "auth-service", "user-service"],
} as const
```

Observed pattern:
- runtime config lives in typed domain-prefixed shapes
- constants and policy flags are explicit and centralized
- phase 5 should add names like `GatewayHardeningConfig`, `gatewayDemandLimits`, `PersistedQueryMode`

### ERROR_HANDLING
// SOURCE: `apps/auth-service/src/auth/auth.service.ts:20-29,66-73`, `libs/platform-auth/src/roles.guard.ts:29-43`
```ts
if (!user || password !== user.passwordHash) {
  this.auditService.record({
    type: auditEventTypes.authLoginFailed,
```

```ts
if (!hasRole) {
  throw new ForbiddenException("Missing required role")
}
```

Observed pattern:
- security/runtime failures are explicit Nest exceptions with safe messages
- side effects like audit/metrics happen adjacent to failure, then exception is thrown
- hardening rejections should follow the same pattern: emit signal, throw explicit exception

### LOGGING_PATTERN
// SOURCE: `libs/platform-logger/src/index.ts:40-83`, `libs/platform-observability/src/request-logging.interceptor.ts:18-40`
```ts
export const platformLoggerBaseline = {
  implementation: "di-managed-pino-adapter",
  bufferLogsAtBootstrap: true,
  redactFields: ["password", "accessToken", "refreshToken", "authorization"],
} as const
```

```ts
this.logger.logWithContext("log", "request.started", {
  requestId: correlation.requestId,
  traceId: correlation.traceId,
  operationName: correlation.operationName,
```

Observed pattern:
- hardening outcomes should be logged as structured events with request/trace metadata
- never dump full query text or secrets into logs for rejected requests

### REPOSITORY_PATTERN
// SOURCE: `apps/auth-service/src/auth/auth.repository.ts:1-9`, `libs/platform-observability/src/metrics.ts:3-26`
```ts
@Injectable()
export class AuthRepository {
  findByEmail(_email: string): Promise<AuthRecord | null> {
    return Promise.resolve(null)
  }
}
```

```ts
export const platformRequestCounter = new client.Counter({
  name: "nest_core_requests_total",
```

Observed pattern:
- focused classes or singleton registries per concern
- phase 5 should add small guard/interceptor/helper files rather than a monolithic “hardening” file

### SERVICE_PATTERN
// SOURCE: `apps/gateway/src/main.ts:15-36`, `apps/gateway/src/graphql/graphql.module.ts:9-29`
```ts
async function bootstrap(): Promise<void> {
  await bootstrapPlatformInstrumentation()

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })
```

```ts
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
```

Observed pattern:
- bootstrap remains thin while shared controls are installed centrally
- GraphQL config is already async and config-driven, ideal place to add depth/complexity/persisted-query controls

### TEST_STRUCTURE
// SOURCE: `test/app-module-compile.test.mjs:1-21`, `test/auth-integration.test.mjs:25-219`, `test/observability-integration.test.mjs:25-85`
```js
test("gateway AppModule compiles", async () => {
  const { AppModule } = await import("../dist/apps/gateway/src/app.module.js")
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
```

```js
const { default: request } = await import("supertest")
const { AuthService } = await import("../dist/apps/auth-service/src/auth/auth.service.js")
```

Observed pattern:
- repo uses both structural tests and compiled-artifact integration tests
- phase 5 should extend this with gateway-focused integration checks for rate limit, query rejection, and timeout/error mapping

---

## Unified Discovery Table

| Category | File:Lines | Pattern | Key Snippet |
|---|---|---|---|
| Similar implementation | `apps/gateway/src/graphql/graphql.module.ts:9-29` | Async config-driven GraphQL bootstrap | `GraphQLModule.forRootAsync` |
| Similar implementation | `apps/gateway/src/main.ts:22-27` | Global gateway interceptors already exist | `app.useGlobalInterceptors(...)` |
| Naming | `libs/platform-config/src/app-config.ts:17-23` | Typed config groups for cross-cutting concerns | `ObservabilityRuntimeConfig` |
| Error | `libs/platform-auth/src/roles.guard.ts:29-43` | Explicit access-control failures via Nest exceptions | `throw new ForbiddenException(...)` |
| Logging | `libs/platform-logger/src/index.ts:74-82` | Structured log payloads via `logWithContext` | `JSON.stringify({ service, message, ...context })` |
| Type definitions | `libs/platform-auth/src/auth-context.ts:9-25` | Focused request/claims types for auth gateway use | `TenantRequestContext` |
| Test patterns | `test/app-module-compile.test.mjs:1-21` | Compile full app modules to catch DI/runtime wiring issues | `Test.createTestingModule({ imports: [AppModule] })` |
| Configuration | `libs/platform-config/src/app-config.ts:43-95` | Shared startup validation and config generation | `createPlatformConfigNamespace(...)` |
| Dependencies | `package.json:14-57` | No throttler/caching/resilience libs yet for gateway hardening | Missing `@nestjs/throttler`, GraphQL demand control helpers, cache store libs |
| Entry points | `apps/gateway/src/main.ts:15-36` | One central bootstrap path for hardening middleware/interceptors | `NestFactory.create(AppModule)` |

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | UPDATE | Mark `Gateway Hardening` as `in-progress` and attach plan path |
| `package.json` | UPDATE | Add gateway hardening dependencies and test scripts if needed |
| `libs/platform-config/src/app-config.ts` | UPDATE | Add gateway hardening config for rate limits, query depth, complexity, timeouts, persisted query mode |
| `apps/gateway/src/main.ts` | UPDATE | Attach global gateway protections such as throttling or timeout interceptors if registered there |
| `apps/gateway/src/app.module.ts` | UPDATE | Import hardening modules/providers |
| `apps/gateway/src/graphql/graphql.module.ts` | UPDATE | Add GraphQL depth/complexity controls, introspection/IDE policy, persisted query baseline |
| `apps/gateway/src/auth/gateway-auth.module.ts` | UPDATE | Wire rate limiting guard coordination with GraphQL auth if needed |
| `apps/gateway/src/guards/gql-throttler.guard.ts` | CREATE | GraphQL-aware throttling guard |
| `apps/gateway/src/guards/query-complexity.guard.ts` or validation helper | CREATE | GraphQL demand control baseline |
| `apps/gateway/src/interceptors/gateway-timeout.interceptor.ts` | CREATE | Timeout/fail-fast request interceptor |
| `apps/gateway/src/interceptors/gateway-cache.interceptor.ts` or helper | CREATE | Explicit/manual cache baseline where appropriate |
| `apps/gateway/src/graphql/persisted-queries.ts` | CREATE | Persisted query mode/config helper and decision point |
| `apps/gateway/src/graphql/query-validation.ts` | CREATE | Depth/complexity helper functions or plugin wiring |
| `libs/platform-observability/src/audit-events.ts` | UPDATE | Add gateway hardening event types for throttling/query rejection/timeout if emitted |
| `test/app-module-compile.test.mjs` | UPDATE | Ensure gateway module still compiles with hardening dependencies |
| `test/gateway-hardening-smoke.test.mjs` | CREATE | Structural checks for guards, config, and GraphQL hardening wiring |
| `test/gateway-hardening-integration.test.mjs` | CREATE | Integration tests for rate limiting, query rejection, and timeout/failure mapping |

## NOT Building

- Full Redis-backed distributed throttling storage for production scale
- Full CDN/APQ deployment rollout for real clients
- Sophisticated circuit-breaker library across downstream services
- Full gateway response cache for arbitrary GraphQL results
- WAF, bot management, or infrastructure-level abuse controls outside the app layer
- Accounting-domain query-specific optimization beyond general GraphQL hardening baseline

---

## Step-by-Step Tasks

### Task 1: Add gateway hardening dependencies and config surface
- **ACTION**: Extend root dependencies and config with hardening-related settings.
- **IMPLEMENT**: Add `@nestjs/throttler` and any minimal helper libraries for GraphQL depth/complexity validation; add config for rate limits, max query depth, max query complexity, request timeout, introspection policy, and persisted-query mode.
- **MIRROR**: Existing `platform-config` runtime config grouping pattern.
- **IMPORTS**: `package.json`, `libs/platform-config/src/app-config.ts`.
- **GOTCHA**: Keep defaults safe for production but usable in local development; do not silently enable IDE/introspection outside intended environments.
- **VALIDATE**: `npm run build` passes and config surface is centralized.

### Task 2: Add GraphQL-aware rate limiting
- **ACTION**: Protect the gateway with request throttling that works for GraphQL.
- **IMPLEMENT**: Add `ThrottlerModule` config and a `GqlThrottlerGuard` that adapts request extraction through `GqlExecutionContext`; apply it globally or to selected GraphQL paths with explicit public-route exceptions if needed.
- **MIRROR**: Existing GraphQL auth guard pattern in `platform-auth` and gateway auth module wiring.
- **IMPORTS**: `@nestjs/throttler`, `@nestjs/core`, `@nestjs/graphql`.
- **GOTCHA**: The default HTTP throttler guard will not behave correctly for GraphQL unless request extraction is overridden.
- **VALIDATE**: Integration test can trigger throttling behavior or at least confirm the guard wiring is active.

### Task 3: Add GraphQL depth and complexity validation
- **ACTION**: Reject abusive queries before execution.
- **IMPLEMENT**: Add depth limit and complexity/breadth control helper/plugin in `graphql.module.ts`; wire it through Apollo/Nest validation hooks with explicit thresholds from config.
- **MIRROR**: Existing async GraphQL configuration pattern.
- **IMPORTS**: GraphQL validation helpers, Apollo config/plugin hooks.
- **GOTCHA**: Depth-only checks are insufficient; add at least one additional cost control dimension or explicit note/guard for breadth/alias abuse.
- **VALIDATE**: Integration test shows an over-depth or over-complexity query is rejected early.

### Task 4: Lock down introspection, IDE, and persisted query baseline
- **ACTION**: Turn GraphQL endpoint exposure into a deliberate policy.
- **IMPLEMENT**: Add config-driven introspection and IDE policy for non-development environments; define persisted-query mode helper (e.g. `none`, `apq`, `trusted-documents`) and wire current baseline decision in code.
- **MIRROR**: Existing secure-by-default GraphQL IDE handling.
- **IMPORTS**: GraphQL module config, optional Apollo persisted query support.
- **GOTCHA**: APQ is not a security control; if you do not implement trusted documents, document that the current persisted query mode is performance-oriented only.
- **VALIDATE**: Smoke test confirms production-safe defaults are encoded.

### Task 5: Add gateway timeout and failure mapping baseline
- **ACTION**: Prevent hung downstream/request paths from stalling the gateway indefinitely.
- **IMPLEMENT**: Add a timeout interceptor for gateway requests and map timeout/fail-fast errors to safe GraphQL/HTTP responses; prepare hook points for downstream client timeout settings.
- **MIRROR**: Existing explicit exception handling and shared logging/audit patterns.
- **IMPORTS**: Nest interceptors, RxJS timeout operators, observability/audit helpers.
- **GOTCHA**: A request timeout interceptor is not enough if downstream HTTP clients later get added without their own timeout config; document both layers.
- **VALIDATE**: Integration test proves timeout/interceptor behavior or at least explicit failure mapping contract.

### Task 6: Add gateway-level hardening observability signals
- **ACTION**: Make hardening actions visible to operators.
- **IMPLEMENT**: Emit metrics/audit/log signals for throttled requests, query validation rejections, timeout events, and persisted-query decisions when applicable.
- **MIRROR**: Current audit event taxonomy and observability counter patterns.
- **IMPORTS**: `libs/platform-observability` metrics/audit modules.
- **GOTCHA**: Do not log raw rejected GraphQL documents if they may contain sensitive literals; prefer operation name and rejection reason.
- **VALIDATE**: Observability tests can assert the new signal names/paths exist.

### Task 7: Add minimal cache strategy baseline
- **ACTION**: Establish a safe caching posture without overpromising GraphQL response caching.
- **IMPLEMENT**: Add explicit helper/interceptor/module for targeted cache use (if any), and document/encode that Nest `CacheInterceptor` is not the default GraphQL response caching strategy.
- **MIRROR**: Existing platform helper/module approach.
- **IMPORTS**: Nest caching primitives only if used deliberately.
- **GOTCHA**: Avoid blanket GraphQL response caching; prefer explicit/manual cache points or leave the baseline as “no response cache yet” with code comments/config markers.
- **VALIDATE**: Smoke tests confirm whichever cache strategy baseline is selected is explicit in code/config.

### Task 8: Add compile, smoke, and integration tests for hardening controls
- **ACTION**: Ensure hardening is test-backed and not just config text.
- **IMPLEMENT**: Add structural smoke tests for throttle/complexity/timeout wiring and integration tests for rejected over-limit or malformed requests, plus compile tests to catch DI issues.
- **MIRROR**: Existing `app-module-compile`, auth integration, and observability integration test patterns.
- **IMPORTS**: `@nestjs/testing`, `supertest`, compiled `dist` artifact imports.
- **GOTCHA**: Keep tests deterministic; for throttling, isolate time windows or configure test-specific limits to avoid flaky behavior.
- **VALIDATE**: `npm test` passes with at least one behavior-level gateway hardening assertion.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| Gateway hardening config coverage | `platform-config` fields | Rate/depth/complexity/timeout settings exist and validate | Yes |
| Throttler guard wiring | Gateway module files | GraphQL-aware throttler guard is present and registered | Yes |
| GraphQL demand control coverage | GraphQL config/helpers | Depth/complexity hooks are attached to gateway GraphQL config | Yes |
| Timeout interceptor coverage | Gateway interceptor | Timeout path maps to safe failure response | Yes |
| Persisted query mode coverage | GraphQL hardening helper | Mode is explicit and production-safe by default | Yes |
| Hardening observability coverage | Audit/metrics definitions | Rejection/timeout/throttle events have signal names | Yes |

### Edge Cases Checklist
- [ ] Burst requests from same client exceed threshold
- [ ] Deep query with low breadth still rejected by depth control
- [ ] Shallow but overly broad/aliased query does not bypass all cost checks
- [ ] IDE/introspection disabled outside development where intended
- [ ] Persisted/APQ mode does not accidentally widen endpoint exposure
- [ ] Timeout handling does not leak internal stack traces
- [ ] Hardening logs do not include raw secret/token/query payloads
- [ ] Gateway compile/runtime remains intact after guard/interceptor additions

---

## Validation Commands

### Static Analysis
```bash
# Run type checker
npm run build
```
EXPECT: Zero type errors

### Unit Tests
```bash
# Run tests for affected area
npm test
```
EXPECT: All tests pass

### Full Test Suite
```bash
# Run complete test suite
npm test
```
EXPECT: No regressions

### Database Validation (if applicable)
```bash
# Verify schema/migrations
npm run db:validate
```
EXPECT: No DB changes required; command remains placeholder unless explicitly updated

### Browser Validation (if applicable)
```bash
# Start gateway and verify
npm run start:gateway
```
EXPECT: Gateway boots with hardening controls and health/metrics surfaces still available

### Manual Validation
- [ ] gateway refuses or throttles abusive request patterns with safe error responses
- [ ] GraphQL config encodes depth/complexity/IDE/introspection policy explicitly
- [ ] timeout behavior is visible in metrics/audit/logs
- [ ] app module compile smoke tests still pass after hardening controls are added

---

## Acceptance Criteria
- [ ] All tasks completed
- [ ] All validation commands pass
- [ ] Tests written and passing
- [ ] No type errors
- [ ] No lint errors
- [ ] Matches UX design (if applicable)

## Completion Checklist
- [ ] Code follows discovered patterns
- [ ] Error handling matches codebase style
- [ ] Logging follows codebase conventions
- [ ] Tests follow test patterns
- [ ] No hardcoded values
- [ ] Documentation updated (if needed)
- [ ] No unnecessary scope additions
- [ ] Self-contained — no questions needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hardening phase breaks GraphQL auth or observability wiring | Medium | High | Build on existing guards/interceptors and keep compile/integration tests for gateway paths |
| Rate limiting becomes flaky in tests or ineffective in GraphQL | Medium | High | Use GraphQL-aware guard and deterministic test configuration |
| Complexity controls block legitimate requests or miss abusive breadth | Medium | High | Use conservative defaults, config-driven thresholds, and layered checks |
| Timeout strategy only covers inbound path, not future downstream clients | Medium | Medium | Document and encode both gateway request timeout and downstream client timeout expectations |
| Cache strategy is overbuilt and creates stale-data bugs | Medium | Medium | Keep cache baseline minimal and explicit; avoid blanket GraphQL response caching |

## Notes
- This phase should produce a gateway that is harder to abuse, not just one with more config fields.
- The most valuable outputs are behavior-level rejections and safe runtime defaults, backed by tests.
- After phase 5, the repo should be in a much better position to reason about production pilot readiness before expanding into accounting domains.
