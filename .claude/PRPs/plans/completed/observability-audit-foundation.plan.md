# Plan: Observability & Audit Foundation

## Summary
Phase `Observability & Audit Foundation` sẽ biến các placeholder observability hiện có thành một nền giám sát và audit thực thi được cho `gateway`, `auth-service`, và `user-service`. Trọng tâm là chuẩn hóa structured request logging, correlation IDs, distributed tracing bootstrap, Prometheus metrics exposure, và audit/security event taxonomy cho identity flows, sao cho request có thể được theo dấu end-to-end trước khi các domain kế toán xuất hiện.

## User Story
As a platform engineering team, I want consistent logging, tracing, metrics, and audit event baselines across gateway, auth, and user services, so that I can diagnose auth and tenant issues end-to-end before the accounting domain becomes more complex.

## Problem → Solution
Hiện codebase đã có logger/observability modules ở mức placeholder, nhưng chưa có request correlation, trace bootstrap, metrics registry, metrics endpoint, hay audit event flow nào thực thi được -> thêm platform observability runtime surface, request/response instrumentation, metrics collection and exposure, audit event contracts, và smoke/integration checks để hệ thống thực sự quan sát được.

## Metadata
- **Complexity**: XL
- **Source PRD**: `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`
- **PRD Phase**: Observability & Audit Foundation
- **Estimated Files**: 30

---

## UX Design

### Before
N/A — internal change

### After
N/A — internal change

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Incoming request | Không có correlation/request instrumentation thống nhất | Có request ID, trace ID, service name, operation name trên mọi request log | Internal operator-facing change |
| Auth flow | Chưa có audit/security events chuẩn | Login success/failure, token rejection, membership denial có audit taxonomy rõ | Hữu ích cho support và security review |
| Metrics | Chưa có `/metrics` hoặc registry chuẩn | Mỗi app expose metrics endpoint và default/process/http metrics | Hỗ trợ monitoring baseline |
| Tracing | Chưa có bootstrap OTel thực tế | Mỗi app có trace bootstrap point và propagation contract rõ | Chuẩn bị cho distributed debugging |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | 169-204 | Defines observability/audit phase scope, success signal, and stack decisions |
| P0 (critical) | `docs/architecture/adr-003-observability-baseline.md` | 1-34 | Frozen observability decisions: mandatory log fields, OTel ordering, backends |
| P0 (critical) | `docs/architecture/adr-005-error-and-config-contracts.md` | 11-31 | Error metadata and startup validation rules that observability must preserve |
| P0 (critical) | `libs/platform-logger/src/index.ts` | 1-46 | Current logger baseline and field contract |
| P0 (critical) | `libs/platform-observability/src/index.ts` | 1-43 | Current observability baseline and module placeholder |
| P0 (critical) | `apps/gateway/src/main.ts` | 1-24 | Current bootstrap shape where request logging/tracing hooks must attach |
| P0 (critical) | `apps/auth-service/src/main.ts` | 1-24 | Current auth bootstrap path |
| P0 (critical) | `apps/user-service/src/main.ts` | 1-24 | Current user bootstrap path |
| P1 (important) | `apps/gateway/src/graphql/graphql.module.ts` | 1-24 | Current GraphQL request context injection point for correlation metadata |
| P1 (important) | `apps/auth-service/src/auth/auth.controller.ts` | 1-27 | Auth endpoints that should emit audit/security events |
| P1 (important) | `apps/user-service/src/membership/membership.controller.ts` | 1-22 | Membership denial path that should emit metrics/log/audit signal |
| P1 (important) | `test/auth-integration.test.mjs` | 1-204 | Current integration-style test pattern using `@nestjs/testing` + `supertest` |
| P1 (important) | `.claude/PRPs/reports/identity-tenant-foundation-report.md` | 1-116 | Current phase 3 state, decisions, and remaining gaps |
| P2 (reference) | `.opencode/plugins/ecc-hooks.ts` | 55-124 | Small structured logging helper and warning/info conventions |
| P2 (reference) | `.opencode/tools/run-tests.ts` | 33-95 | Thin orchestrator + helper pattern for reusable runtime helpers |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Nest logger customization | `docs.nestjs.com/techniques/logger` | Use DI-aware/custom logger integration and keep bootstrap logger attached with `bufferLogs` when startup logging matters |
| OTel Node bootstrap | `opentelemetry.io/docs/languages/js/getting-started/nodejs/` | Instrumentation must initialize before app code; `NodeSDK` and auto-instrumentation setup should be loaded before Nest bootstraps |
| Prometheus metrics in Node | `github.com/siimon/prom-client` | Use a registry, `collectDefaultMetrics`, explicit metric names/labels, and expose `await registry.metrics()` on an endpoint |
| Health/readiness with Terminus | `docs.nestjs.com/recipes/terminus` | Health/readiness should remain explicit and pair cleanly with graceful shutdown hooks |
| Audit/security event patterns | Auth flow best practice synthesis from prior PRD + security review | Audit should record identity outcomes (login success/failure, token rejection, forbidden membership access) with correlation metadata, not secrets |

---

## Patterns to Mirror

### NAMING_CONVENTION
// SOURCE: `libs/platform-logger/src/index.ts:3-24`, `libs/platform-observability/src/index.ts:3-26`, `libs/platform-config/src/index.ts:11-31`
```ts
export const platformLoggerModuleName = "platform-logger" as const

export const platformLoggerFields = [
  "timestamp",
  "level",
  "service",
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
- platform concerns use explicit `platform*` naming
- literal arrays/objects double as runtime contract and type source
- phase 4 should use names like `platformMetricsRegistry`, `auditEventType`, `requestCorrelationContext`

### ERROR_HANDLING
// SOURCE: `apps/auth-service/src/auth/auth.service.ts:17-25, 63-66`, `apps/user-service/src/membership/membership.controller.ts:16-18`, `docs/architecture/adr-005-error-and-config-contracts.md:13-24`
```ts
if (!user || password !== user.passwordHash) {
  throw new UnauthorizedException("Invalid credentials")
}
```

```ts
if (request.user.userId !== userId) {
  throw new ForbiddenException("Forbidden")
}
```

Observed pattern:
- runtime paths use explicit Nest exceptions with narrow messages
- observability should capture metadata about failures without mutating public-safe error shapes
- phase 4 must avoid logging sensitive auth payloads while still recording rejection events

### LOGGING_PATTERN
// SOURCE: `libs/platform-logger/src/index.ts:20-46`, `.opencode/plugins/ecc-hooks.ts:55-57`
```ts
export const platformLoggerBaseline = {
  implementation: "di-managed-pino-adapter",
  bufferLogsAtBootstrap: true,
  redactFields: ["password", "accessToken", "refreshToken", "authorization"],
} as const
```

```ts
const log = (level: "debug" | "info" | "warn" | "error", message: string) =>
  client.app.log({ body: { service: "ecc", level, message } })
```

Observed pattern:
- service-scoped structured logging is already expected
- phase 4 should enrich logger output with correlation metadata and operation markers, not replace the baseline

### REPOSITORY_PATTERN
// SOURCE: `apps/auth-service/src/auth/auth.repository.ts:1-9`, `libs/platform-auth/src/constants.ts:1-20`
```ts
@Injectable()
export class AuthRepository {
  findByEmail(_email: string): Promise<AuthRecord | null> {
    return Promise.resolve(null)
  }
}
```

```ts
export const authTokenClaimKeys = {
  subject: "sub",
  email: "email",
  tenantId: "tenantId",
```

Observed pattern:
- small, explicit classes/contracts close to the feature
- phase 4 should follow this with focused `AuditEventService`, `MetricsService`, or `RequestContextInterceptor` units instead of one huge observability file

### SERVICE_PATTERN
// SOURCE: `apps/gateway/src/main.ts:7-21`, `libs/platform-config/src/index.ts:35-53`, `apps/auth-service/src/auth/auth.service.ts:17-61`
```ts
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  app.useLogger(createPlatformLogger("gateway"))
```

```ts
export class PlatformConfigModule {
  static register(definition: PlatformAppConfigDefinition): DynamicModule {
```

```ts
issueTokens(user: AuthenticatedUser): TokenResponseDto {
  const authConfig = this.configService.getOrThrow<{
```

Observed pattern:
- bootstrap code stays thin
- config lookup happens inside focused services/modules
- phase 4 should attach logging/tracing/metrics through helpers, interceptors, and modules rather than bloating each `main.ts`

### TEST_STRUCTURE
// SOURCE: `test/auth-integration.test.mjs:24-204`, `test/identity-tenant-foundation-smoke.test.mjs:13-59`
```js
test("POST /auth/login validates payload and authenticates via repository-backed service", async () => {
  const { default: request } = await import("supertest")
  const { AuthService } = await import("../dist/apps/auth-service/src/auth/auth.service.js")
```

```js
test("gateway exposes GraphQL auth integration and resolver", () => {
  const gatewayAuthModule = fs.readFileSync("apps/gateway/src/auth/gateway-auth.module.ts", "utf8")
```

Observed pattern:
- the repo now has two test layers: structural smoke tests and lightweight integration tests against compiled `dist`
- phase 4 should preserve this split: fast smoke assertions for observability wiring plus at least one integration test proving correlation/metrics/audit behavior

---

## Unified Discovery Table

| Category | File:Lines | Pattern | Key Snippet |
|---|---|---|---|
| Similar implementation | `libs/platform-logger/src/index.ts:20-46` | Shared module + helper baseline exists for logger | `createPlatformLogger(serviceName: string)` |
| Similar implementation | `libs/platform-observability/src/index.ts:28-43` | Placeholder observability options/module already exists | `createPlatformObservabilityOptions(serviceName)` |
| Naming | `libs/platform-config/src/index.ts:13-17` | Dot-separated token names for platform concerns | `platform.config.observability` |
| Error | `apps/auth-service/src/auth/auth.service.ts:17-25,63-66` | Explicit auth exceptions with safe messages | `throw new UnauthorizedException(...)` |
| Logging | `libs/platform-logger/src/index.ts:20-24` | Redaction list already defined | `redactFields: ["password", ...]` |
| Type definitions | `libs/platform-auth/src/auth-context.ts:3-25` | Claims/request context stored as focused exported types | `TenantRequestContext` |
| Test patterns | `test/auth-integration.test.mjs:24-204` | `@nestjs/testing` + `supertest` against built artifacts | `const { default: request } = await import("supertest")` |
| Configuration | `libs/platform-config/src/index.ts:35-53` | Shared dynamic module for startup config validation | `ConfigModule.forRoot({ ... validationSchema })` |
| Dependencies | `package.json:28-57` | Logger/observability runtime not yet installed beyond config placeholders | No `pino`, no `@opentelemetry/*`, no `prom-client` yet |
| Entry points | `apps/*/src/main.ts` | All three services share the same bootstrap pattern | `app.useLogger(...); app.useGlobalPipes(...);` |

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | UPDATE | Mark `Observability & Audit Foundation` as `in-progress` and attach plan path |
| `package.json` | UPDATE | Add observability/runtime dependencies and any new metrics/test scripts |
| `libs/platform-config/src/app-config.ts` | UPDATE | Add observability env config for metrics path, service names, trace exporter toggles, audit behavior |
| `libs/platform-logger/src/index.ts` | UPDATE | Replace logger placeholder with reusable request-aware logger service/helper/interceptor surface |
| `libs/platform-observability/src/index.ts` | UPDATE | Turn placeholder into real metrics/trace bootstrap helper exports |
| `libs/platform-observability/src/instrumentation.ts` | CREATE | Central OTel bootstrap/setup helper |
| `libs/platform-observability/src/metrics.ts` | CREATE | Prometheus registry/default metrics setup |
| `libs/platform-observability/src/request-context.ts` | CREATE | Correlation/request context helpers and types |
| `libs/platform-observability/src/audit-events.ts` | CREATE | Audit event taxonomy and typed contracts |
| `libs/platform-observability/src/audit.service.ts` | CREATE | Audit event emission service |
| `libs/platform-observability/src/request-logging.interceptor.ts` | CREATE | Request/response logging for HTTP/GraphQL boundaries |
| `libs/platform-observability/src/metrics.interceptor.ts` | CREATE | HTTP/GraphQL metric recording interceptor or helper |
| `apps/gateway/src/main.ts` | UPDATE | Attach observability bootstrap, metrics endpoint, correlation handling |
| `apps/gateway/src/app.module.ts` | UPDATE | Import observability providers/interceptors where needed |
| `apps/gateway/src/graphql/graphql.module.ts` | UPDATE | Add correlation metadata into GraphQL context and operation naming hooks |
| `apps/auth-service/src/main.ts` | UPDATE | Attach observability bootstrap for auth service |
| `apps/auth-service/src/app.module.ts` | UPDATE | Import audit/metrics/logging helpers |
| `apps/auth-service/src/auth/auth.controller.ts` | UPDATE | Emit audit/security events for login and profile access outcomes |
| `apps/auth-service/src/auth/auth.service.ts` | UPDATE | Emit security/audit signal hooks for auth outcomes without logging secrets |
| `apps/user-service/src/main.ts` | UPDATE | Attach observability bootstrap for user service |
| `apps/user-service/src/app.module.ts` | UPDATE | Import observability providers/interceptors |
| `apps/user-service/src/membership/membership.controller.ts` | UPDATE | Emit audit/security/denial events and metric increments |
| `apps/*/src/health/health.module.ts` | UPDATE | Optionally enrich readiness with metrics/trace/log metadata if needed |
| `test/platform-skeleton-smoke.test.mjs` | UPDATE | Extend for observability wiring presence |
| `test/identity-tenant-foundation-smoke.test.mjs` | UPDATE | Extend for audit/metrics/correlation wiring where appropriate |
| `test/observability-foundation-smoke.test.mjs` | CREATE | Structural verification of observability modules, metrics, and audit contracts |
| `test/observability-integration.test.mjs` | CREATE | Integration tests for correlation IDs, metrics endpoint, and auth audit/security events |

## NOT Building

- Full vendor-specific exporters for Loki/Tempo/Grafana Cloud production rollout
- Distributed tracing across real downstream network hops beyond the current local services
- Persisted audit store backed by database or message broker
- Full dashboard provisioning/JSON manifests for Grafana
- Alertmanager rules, SLO definitions, or gateway hardening controls from phase 5
- Domain-level accounting audit events outside identity/membership/security flows

---

## Step-by-Step Tasks

### Task 1: Add observability dependencies and config surface
- **ACTION**: Extend root dependencies and shared config for logging/tracing/metrics/audit runtime.
- **IMPLEMENT**: Add packages such as `pino`, `nestjs-pino` or equivalent adapter, `prom-client`, and the required `@opentelemetry/*` packages; extend config with service name, metrics endpoint path, audit enable flag, and trace/metrics toggles.
- **MIRROR**: `platform-config` dynamic module pattern and explicit contract naming.
- **IMPORTS**: `package.json`, `libs/platform-config/src/app-config.ts`, `libs/platform-config/src/index.ts`.
- **GOTCHA**: Keep config fail-fast and avoid introducing optional silent defaults for secrets or exporter endpoints that should be explicit.
- **VALIDATE**: `npm run build` passes and config contract exposes observability settings for all apps.

### Task 2: Replace logger placeholder with request-aware structured logging surface
- **ACTION**: Turn `platform-logger` into a practical shared logger module/helper set.
- **IMPLEMENT**: Add request-aware logger wrapper/helpers/interceptor support that attaches service name, request ID, trace ID, tenant ID, user ID, operation name, and redaction rules.
- **MIRROR**: `platformLoggerFields`, `platformLoggerBaseline`, and the small structured logging helper style from `.opencode`.
- **IMPORTS**: Nest logger abstractions, chosen pino adapter, request context helper types.
- **GOTCHA**: Never log raw credentials, access tokens, refresh tokens, or full authorization headers.
- **VALIDATE**: Logger module exports one shared path that all three apps can consume consistently.

### Task 3: Implement correlation/request-context propagation helpers
- **ACTION**: Define how request IDs and trace-related metadata move through HTTP and GraphQL.
- **IMPLEMENT**: Add request context types/helpers/interceptor(s) to populate `requestId`, surface `traceparent` and `x-request-id`, and expose correlation metadata in request/GraphQL context.
- **MIRROR**: Existing GraphQL context injection and auth request-context patterns.
- **IMPORTS**: Nest interceptors/middleware primitives, GraphQL context helpers, platform auth context types.
- **GOTCHA**: Keep correlation metadata additive and non-invasive; do not mutate auth claims or public response shapes unnecessarily.
- **VALIDATE**: At least one integration test can observe request ID/correlation metadata passing through request handling.

### Task 4: Implement metrics registry and metrics endpoint baseline
- **ACTION**: Add Prometheus-compatible metrics collection for all apps.
- **IMPLEMENT**: Create a shared metrics registry, register default process/runtime metrics, define HTTP/auth/membership counters/histograms, and expose a `/metrics` endpoint (or shared path) per service.
- **MIRROR**: `prom-client` registry pattern and existing health module structure.
- **IMPORTS**: `prom-client`, Nest controllers/modules/interceptors.
- **GOTCHA**: Avoid metric-label explosion; keep labels bounded (service, route/operation, status class, outcome). Do not label on user IDs or tenant IDs.
- **VALIDATE**: Integration test can fetch the metrics endpoint and observe expected metric names.

### Task 5: Implement OTel bootstrap and tracing entrypoints
- **ACTION**: Turn `platform-observability` into a real tracing bootstrap surface.
- **IMPLEMENT**: Add instrumentation/bootstrap helper(s) that initialize OTel before app code, plus resource/service-name configuration and basic auto-instrumentation setup. Ensure bootstrap path is explicit in scripts or app startup flow.
- **MIRROR**: `platformObservabilityBaseline.traceBootstrapOrder` and OTel docs requiring pre-app initialization.
- **IMPORTS**: `@opentelemetry/sdk-node`, `@opentelemetry/api`, `@opentelemetry/auto-instrumentations-node`, trace/metrics SDK packages.
- **GOTCHA**: Instrumentation must load before Nest creates the app; if full runtime wiring is deferred, the hook point must still be explicit and testable.
- **VALIDATE**: Build passes and an integration/smoke test confirms the bootstrap hook file/module exists and is wired into runtime paths.

### Task 6: Add request logging and metrics instrumentation to app entrypoints
- **ACTION**: Connect logging/metrics/correlation to `gateway`, `auth-service`, and `user-service` bootstraps.
- **IMPLEMENT**: Update each `main.ts` and/or root module to install shared request logging and metrics interceptors, preserving existing validation pipes and logger setup.
- **MIRROR**: Thin `main.ts` bootstrap style and shared module registration patterns.
- **IMPORTS**: Shared platform logger/observability modules, interceptors, config helpers.
- **GOTCHA**: Do not duplicate large bootstrap logic across all three apps; keep common setup extractable.
- **VALIDATE**: Structural smoke tests confirm all apps wire shared observability helpers consistently.

### Task 7: Define and implement auth/security audit event taxonomy
- **ACTION**: Add typed audit/security event contracts focused on phase-3 identity flows.
- **IMPLEMENT**: Define event types for `auth.login_succeeded`, `auth.login_failed`, `auth.access_token_rejected`, `membership.access_denied`, and similar identity outcomes; add an `AuditService` that records/logs these events in a structured way.
- **MIRROR**: Existing focused contract style in `platform-auth` and safe logging conventions.
- **IMPORTS**: Platform logger/observability helpers, Nest injectable service primitives.
- **GOTCHA**: Audit events must capture metadata and outcome without storing raw passwords, full JWTs, or secrets.
- **VALIDATE**: Smoke tests confirm taxonomy exists; integration tests observe audit emission on login failure or membership denial paths.

### Task 8: Instrument auth and membership flows with audit/security signals
- **ACTION**: Emit audit/security events from the most important identity paths.
- **IMPLEMENT**: Add audit emission in auth login success/failure, invalid token path, access-token-required rejection, and membership forbidden access. Add matching metric increments/counters where sensible.
- **MIRROR**: Existing explicit exception-based auth flow and service/controller separation.
- **IMPORTS**: `AuthService`, `AuthController`, membership controller, shared audit service, metrics helper(s).
- **GOTCHA**: Do not swallow exceptions just to log/audit; emit then rethrow or record outcome in a non-invasive way.
- **VALIDATE**: Integration tests prove at least one failure and one success path emit the expected observable signal.

### Task 9: Extend GraphQL observability for operation naming and correlation
- **ACTION**: Make GraphQL traffic visible with useful operation metadata.
- **IMPLEMENT**: Enrich GraphQL context and/or plugin hooks to capture operation name, top-level field, request correlation, and auth-aware identity metadata for logs/metrics.
- **MIRROR**: Current `GraphQLModule.forRootAsync()` pattern and auth context injection.
- **IMPORTS**: `@nestjs/graphql`, Apollo config/plugin hooks as needed, shared request-context helpers.
- **GOTCHA**: Avoid logging raw query strings if they may contain sensitive values; prefer operation name and selected metadata.
- **VALIDATE**: Smoke test confirms GraphQL module includes observability hooks/config entries.

### Task 10: Add observability-focused smoke and integration tests
- **ACTION**: Add tests that verify observability behavior, not just file presence.
- **IMPLEMENT**: Create structural smoke tests for module wiring and integration tests for metrics endpoint availability, request correlation, and audit/security event emission on auth/membership flows.
- **MIRROR**: Existing split between structural `node:test` checks and compiled `dist` integration tests using `@nestjs/testing` + `supertest`.
- **IMPORTS**: `node:test`, `supertest`, `@nestjs/testing`, shared platform observability modules/helpers.
- **GOTCHA**: Keep tests deterministic; prefer asserting emitted event objects/metric names over backend-specific exporter behavior.
- **VALIDATE**: `npm test` passes and includes at least one real integration assertion for observability behavior.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| Config observability coverage | `platform-config` observability env fields | All required settings validated centrally | Yes |
| Logger surface coverage | `platform-logger` exports | Shared logger/interceptor/request metadata contracts exist | Yes |
| Metrics registry coverage | Shared metrics module | Registry/default metrics and endpoint wiring exist | Yes |
| Audit taxonomy coverage | `audit-events.ts` | Identity/security event names and payload contracts are explicit | Yes |
| Auth audit emission coverage | Login success/failure paths | Expected event type or metric increment occurs | Yes |
| Membership denial observability coverage | Forbidden path | Denial emits audit/metric signal without leaking sensitive data | Yes |

### Edge Cases Checklist
- [ ] Missing observability config at startup
- [ ] Request arrives without `x-request-id`
- [ ] GraphQL request has no operation name
- [ ] Invalid/expired token should emit safe audit event without leaking token contents
- [ ] Membership forbidden path increments security/denial metric only once
- [ ] Metrics endpoint should not include unbounded labels like userId/tenantId
- [ ] Trace bootstrap ordering should not break app startup when disabled in local env
- [ ] Audit emission failure should not crash the primary request path in phase 4

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
EXPECT: Still placeholder unless this phase introduces explicit audit-store validation stubs only

### Browser Validation (if applicable)
```bash
# Start gateway and verify
npm run start:gateway
```
EXPECT: Gateway boots with observability hooks and health/metrics surfaces available

### Manual Validation
- [ ] all three apps expose a metrics surface or a clearly shared metrics path
- [ ] request logs include service + correlation metadata and redact sensitive fields
- [ ] auth failure and membership denial emit typed audit/security events
- [ ] GraphQL module includes operation/correlation-aware observability hooks
- [ ] observability bootstrap ordering is explicit and documented in code/scripts

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
| Observability phase sprawls into full production ops platform | Medium | High | Keep scope to baseline instrumentation, metrics exposure, and auth-related audit events |
| OTel bootstrap order is implemented incorrectly and yields no spans | Medium | High | Make bootstrap explicit and testable before app startup |
| Metrics labels accidentally include high-cardinality values | Medium | High | Restrict labels to bounded route/outcome/service dimensions only |
| Audit emission leaks sensitive auth data | Medium | High | Reuse redact list and explicitly forbid password/token/body logging in audit payloads |
| Logger/interceptor wiring is duplicated across apps and drifts | Medium | Medium | Centralize helpers in platform logger/observability modules and smoke-test shared usage |

## Notes
- This phase should produce real operator-visible observability signals, not just more placeholder modules.
- Identity flows already exist, so phase 4 should instrument those flows first before inventing broader audit infrastructure.
- The cleanest baseline is: logger + correlation + metrics + audit contracts now, full exporter/backends and dashboards later.
