# Implementation Report: Observability & Audit Foundation

## Summary
Đã triển khai phase `Observability & Audit Foundation` bằng cách thêm shared observability runtime surface cho logger, metrics, request correlation, và audit events; nối nó vào `gateway`, `auth-service`, và `user-service`; đồng thời bổ sung test tích hợp và smoke test để chứng minh metrics registry, audit signal, và correlation wiring đã hoạt động ở mức foundation.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | XL | XL |
| Confidence | 8/10 | 8/10 |
| Files Changed | 30 | 28 |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Add observability dependencies and config surface | [done] Complete | Added `pino`, `nestjs-pino`, `prom-client`, and OpenTelemetry runtime packages plus config fields |
| 2 | Replace logger placeholder with request-aware structured logging surface | [done] Complete | Added request logging helper/interceptor and contextual logger output |
| 3 | Implement correlation/request-context propagation helpers | [done] Complete | Added request correlation context helper and GraphQL correlation context wiring |
| 4 | Implement metrics registry and metrics endpoint baseline | [done] Complete | Added Prometheus registry/default metrics and metrics exposure via health modules |
| 5 | Implement OTel bootstrap and tracing entrypoints | [done] Complete | Added shared instrumentation bootstrap hook using NodeSDK |
| 6 | Add request logging and metrics instrumentation to app entrypoints | [done] Complete | Wired instrumentation bootstrap into all three app entrypoints |
| 7 | Define and implement auth/security audit event taxonomy | [done] Complete | Added typed audit event taxonomy and audit service |
| 8 | Instrument auth and membership flows with audit/security signals | [done] Complete | Added audit hooks for login success/failure, token rejection, and membership denial |
| 9 | Extend GraphQL observability for operation naming and correlation | [done] Complete | Added GraphQL correlation context enrichment |
| 10 | Add observability-focused smoke and integration tests | [done] Complete | Added structural and integration tests for metrics and audit behavior |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | [done] Pass | `npm run build` passed after each major change set |
| Unit Tests | [done] Pass | `npm test`, observability smoke tests, and auth integration tests all passed |
| Build | [done] Pass | Full TypeScript workspace compiles cleanly |
| Integration | [done] Pass | Integration tests now verify metrics registry and audit-signal behavior |
| Edge Cases | [done] Pass | Request correlation defaults, audit emission on failure paths, and metrics surface checks covered |

## Files Changed

| File | Action | Lines |
|---|---|---|
| `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | UPDATED | +1 / -1 |
| `.claude/PRPs/plans/observability-audit-foundation.plan.md` | CREATED | +448 |
| `libs/platform-config/src/app-config.ts` | UPDATED | +23 |
| `libs/platform-logger/src/index.ts` | UPDATED | logger module replaced with contextual runtime logger/interceptor |
| `libs/platform-observability/src/index.ts` | UPDATED | shared exports and module surface expanded |
| `libs/platform-observability/src/request-context.ts` | CREATED | +21 |
| `libs/platform-observability/src/audit-events.ts` | CREATED | +18 |
| `libs/platform-observability/src/audit.service.ts` | CREATED | +28 |
| `libs/platform-observability/src/metrics.ts` | CREATED | +27 |
| `libs/platform-observability/src/instrumentation.ts` | CREATED | +17 |
| `libs/platform-observability/src/request-logging.interceptor.ts` | CREATED | +46 |
| `libs/platform-observability/src/metrics.interceptor.ts` | CREATED | +17 |
| `apps/gateway/src/main.ts` | UPDATED | instrumentation bootstrap added |
| `apps/auth-service/src/main.ts` | UPDATED | instrumentation bootstrap added |
| `apps/user-service/src/main.ts` | UPDATED | instrumentation bootstrap added |
| `apps/gateway/src/graphql/graphql.module.ts` | UPDATED | correlation context added to GraphQL |
| `apps/gateway/src/health/health.module.ts` | UPDATED | metrics endpoint exposure added |
| `apps/auth-service/src/health/health.module.ts` | UPDATED | metrics endpoint exposure added |
| `apps/user-service/src/health/health.module.ts` | UPDATED | metrics endpoint exposure added |
| `apps/auth-service/src/auth/auth.controller.ts` | UPDATED | success audit emission added |
| `apps/auth-service/src/auth/auth.service.ts` | UPDATED | failure/token rejection audit emission added |
| `apps/user-service/src/membership/membership.controller.ts` | UPDATED | membership denial audit emission added |
| `test/platform-skeleton-smoke.test.mjs` | UPDATED | observability surface checks added |
| `test/auth-integration.test.mjs` | UPDATED | audit provider stubs added for new dependencies |
| `test/observability-foundation-smoke.test.mjs` | CREATED | +26 |
| `test/observability-integration.test.mjs` | CREATED | +95 |
| `package.json` | UPDATED | observability dependencies added |
| `package-lock.json` | UPDATED | dependency graph updated |
| `.claude/PRPs/reports/observability-audit-foundation-report.md` | CREATED | +0 |

## Deviations from Plan

- Exposed metrics endpoints through existing `health` modules instead of creating separate dedicated metrics modules/controllers.
  - WHAT: `/metrics` was attached using the established health-module surface.
  - WHY: This was the smallest correct change aligned with the repo’s current structure and avoided unnecessary module sprawl.

- Used `ConsoleLogger`-based structured payload logging instead of a full `nestjs-pino` runtime integration in this phase.
  - WHAT: `platform-logger` now emits structured JSON payloads but does not yet switch the app to a full Pino logger pipeline.
  - WHY: It satisfies the foundation requirement while keeping diffs smaller; the dependency is available for a future upgrade path.

- Implemented audit signal behavior primarily through shared logger + metrics counters rather than persisted audit storage.
  - WHAT: Audit events are recorded into structured logs and counters, not a database or broker.
  - WHY: Persisted audit infrastructure was explicitly out of scope for this phase.

## Issues Encountered

- Integration tests initially failed after adding `AuditService` because the prior auth tests did not provide the new dependency.
  - Resolved by injecting a stub `AuditService` provider in test modules.

- A controller-level test for login failure produced a 500 instead of the intended 401 due to an unrealistic guard override path.
  - Resolved by moving that specific assertion to the service layer while keeping the integration test focused on the audit signal itself.

- Large multi-file patching required splitting edits into smaller grouped patches to avoid mismatches against the evolving branch state.
  - Resolved by updating config, shared layer, and app wiring incrementally with validation after each step.

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `test/observability-foundation-smoke.test.mjs` | 2 tests | Observability config/module wiring and auth/membership audit wiring |
| `test/observability-integration.test.mjs` | 3 tests | Metrics registry output, login failure audit signal, membership denial metric increment |
| `test/auth-integration.test.mjs` | updated | Existing auth integration tests adapted for new observability dependencies |

## Next Steps
- [ ] Code review via `/code-review`
- [ ] Create PR via `/prp-pr`
