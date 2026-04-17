# Plan: Accounting Domain Readiness

## Summary
Phase 6 sẽ chốt đường mở rộng từ foundation hiện tại sang các accounting domains đầu tiên mà không làm đổi nền auth, tenant, observability, hay gateway governance đã hoàn thành ở các phase trước. Trọng tâm là tạo bộ artifact triển khai được: domain-boundary decisions, service expansion path, event taxonomy định hướng, internal HTTP contract baseline, và test/documentation checks để các phase domain tiếp theo có thể bám vào một hợp đồng rõ ràng.

## User Story
As a product and engineering team building a multi-tenant accounting platform, I want explicit accounting domain boundaries and expansion contracts, so that we can implement the first accounting service without redesigning auth, tenant, transport, or observability foundations.

## Problem -> Solution
Foundation services đã sẵn sàng nhưng chưa có ranh giới rõ cho `ledger`, `invoice`, `expense`, `tax`, và `reporting` -> bổ sung architecture artifacts và contract baseline mô tả ownership, integration points, event naming, và validation hooks để domain implementation tiếp theo có thể bắt đầu trên một đường ray rõ ràng.

## Metadata
- **Complexity**: Large
- **Source PRD**: `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`
- **PRD Phase**: `Phase 6 - Accounting Domain Readiness`
- **Estimated Files**: 8

---

## UX Design

### Before
N/A - internal change

### After
N/A - internal change

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Architecture guidance | Only foundation ADRs exist | Accounting domain boundaries documented | Internal architecture consumer is product/engineering |
| Service expansion decisions | Implicit in PRD text only | Explicit service expansion path and contracts | Reduces re-architecture risk |
| Domain implementation kickoff | Requires re-reading PRD and reports | Can start from codified readiness artifacts | Improves single-pass execution for next phase |

---

## Mandatory Reading

Files that MUST be read before implementing:

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | 67-183 | Source scope, phase 6 goal, dependencies, and success signal |
| P0 (critical) | `docs/architecture/adr-002-auth-and-tenant-model.md` | 1-53 | Domain expansion cannot break tenant and membership model |
| P0 (critical) | `docs/architecture/adr-003-observability-baseline.md` | 1-54 | New domain contracts must preserve correlation and audit metadata |
| P0 (critical) | `docs/architecture/adr-004-transport-and-eventing.md` | 1-51 | Event taxonomy and internal HTTP contracts must align with accepted transport decision |
| P0 (critical) | `docs/architecture/adr-005-error-and-config-contracts.md` | 1-45 | New service contracts must fit shared config and error envelope rules |
| P1 (important) | `.claude/PRPs/reports/identity-tenant-foundation-report.md` | 1-116 | Shows existing auth and membership boundaries that accounting services must consume, not replace |
| P1 (important) | `.claude/PRPs/reports/observability-audit-foundation-report.md` | 1-108 | Shows observability and audit surfaces already wired across services |
| P1 (important) | `.claude/PRPs/reports/gateway-hardening-report.md` | 1-88 | Shows current gateway governance and safe constraints for future domain exposure |
| P1 (important) | `apps/gateway/src/graphql/graphql.module.ts` | 1-56 | Demonstrates current gateway entrypoint and correlation context pattern |
| P1 (important) | `apps/gateway/src/auth/auth.resolver.ts` | 1-35 | Demonstrates current GraphQL module/resolver naming and auth guard composition |
| P1 (important) | `apps/auth-service/src/auth/auth.service.ts` | 1-92 | Shows current service-layer style and tenant-aware claim contract |
| P1 (important) | `apps/user-service/src/membership/membership.controller.ts` | 1-35 | Shows service boundary, controller guard, and audit rejection pattern |
| P2 (reference) | `test/architecture-baseline-structure.test.mjs` | 1-76 | Demonstrates repo style for structural architecture assertions |
| P2 (reference) | `test/identity-tenant-foundation-smoke.test.mjs` | 1-59 | Demonstrates smoke-test pattern for architecture contracts |
| P2 (reference) | `test/observability-integration.test.mjs` | 1-85 | Demonstrates audit/metrics verification style |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| none | N/A | No external research needed - feature uses established internal patterns and existing ADR decisions |

---

## Patterns to Mirror

Code patterns discovered in the codebase. Follow these exactly.

### NAMING_CONVENTION
// SOURCE: `apps/user-service/src/membership/membership.module.ts:1-16`
```ts
@Module({
  imports: [ConfigModule, PassportModule, PlatformObservabilityModule],
  controllers: [MembershipController],
  providers: [MembershipService, JwtAuthGuard, JwtStrategy],
  exports: [MembershipService],
})
export class MembershipModule {}
```
Use PascalCase for modules/services/controllers, kebab-case for plan/report filenames, and domain-first naming like `MembershipModule`, `GatewayGraphqlModule`, `AuthService`.

### ERROR_HANDLING
// SOURCE: `apps/user-service/src/membership/membership.controller.ts:20-31`
```ts
if (request.user.userId !== userId) {
  this.auditService.record({
    type: auditEventTypes.membershipAccessDenied,
    service: "user-service",
    requestId: request.requestId,
    outcome: "failure",
    tenantId: request.user.tenantId,
    userId: request.user.userId,
    details: { targetUserId: userId },
  })
  throw new ForbiddenException("Forbidden")
}
```
Reject invalid cross-boundary access with framework exceptions plus audit emission before throwing.

### LOGGING_PATTERN
// SOURCE: `libs/platform-observability/src/audit.service.ts:10-24`
```ts
record(event: AuditEvent): void {
  platformAuditCounter.inc({
    service: event.service,
    eventType: event.type,
    outcome: event.outcome,
  })

  this.logger.logWithContext("log", `audit.${event.type}`, {
    requestId: event.requestId,
    traceId: event.traceId,
    tenantId: event.tenantId,
    userId: event.userId,
    operationName: event.type,
  })
}
```
When defining new audit/event taxonomy, preserve `service`, `requestId`, `traceId`, `tenantId`, `userId`, and operation-aligned naming.

### CONFIG_PATTERN
// SOURCE: `libs/platform-config/src/app-config.ts:65-89`
```ts
export const sharedEnvironmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().optional(),
  GATEWAY_GRAPHQL_PATH: Joi.string().default("/graphql"),
  AUTH_JWT_SECRET: Joi.string().min(32).required(),
  OBS_METRICS_PATH: Joi.string().default("/metrics"),
})
```
If Phase 6 introduces any new contract/config artifact, keep validation centralized and explicit rather than ad hoc environment reads.

### SERVICE_PATTERN
// SOURCE: `apps/auth-service/src/auth/auth.service.ts:19-46`
```ts
async validateUser(email: string, password: string): Promise<AuthenticatedUser> {
  const user = await this.authRepository.findByEmail(email)

  if (!user || password !== user.passwordHash) {
    this.auditService.record({
      type: auditEventTypes.authLoginFailed,
      service: "auth-service",
      outcome: "failure",
      details: { email },
    })
    throw new UnauthorizedException("Invalid credentials")
  }

  const { passwordHash: _passwordHash, ...authenticatedUser } = user
  return authenticatedUser
}
```
Keep domain logic thin and explicit, with side effects declared inline, no speculative abstraction layer.

### TEST_STRUCTURE
// SOURCE: `test/architecture-baseline-structure.test.mjs:32-76`
```js
test("architecture baseline files exist", () => {
  for (const filePath of requiredFiles) {
    assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`)
  }
})

test("ADRs capture key architecture baseline decisions", () => {
  const authAdr = fs.readFileSync("docs/architecture/adr-002-auth-and-tenant-model.md", "utf8")
  assert.match(authAdr, /JWT access token \+ refresh token/)
})
```
Architecture phases in this repo are validated with file-existence and content-contract smoke tests rather than deep runtime tests only.

### ENTRYPOINT_PATTERN
// SOURCE: `apps/gateway/src/graphql/graphql.module.ts:16-50`
```ts
useFactory: (configService: ConfigService) => ({
  ...(() => {
    const hardening = configService.getOrThrow<GatewayHardeningConfig>("gateway.hardening")
    return {
      path: configService.getOrThrow<string>("gateway.graphqlPath"),
      context: ({ req }) => ({
        req,
        correlation: createRequestCorrelationContext({
          headers: req.headers,
          serviceName: "gateway",
          operationName: "graphql.request",
        }),
      }),
    }
  })(),
})
```
Gateway remains orchestration-only. Phase 6 outputs must preserve this by defining contracts for future downstream services rather than moving accounting logic into gateway.

---

## Unified Discovery Table

| Category | File:Lines | Pattern | Key Snippet |
|---|---|---|---|
| Naming | `apps/gateway/src/app.module.ts:13-24` | App modules compose shared platform modules plus domain module imports | `GatewayHardeningModule`, `GatewayGraphqlModule` |
| Naming | `apps/gateway/src/auth/auth.resolver.ts:27-35` | Resolver classes use `@Resolver` + GraphQL object view types | `export class AuthResolver` |
| Error | `apps/auth-service/src/auth/auth.service.ts:22-30` | Throw Nest exception with direct message after audit record | `throw new UnauthorizedException("Invalid credentials")` |
| Error | `libs/platform-auth/src/roles.guard.ts:34-40` | Guard rejects missing tenant context or role mismatch with `ForbiddenException` | `throw new ForbiddenException("Missing required role")` |
| Logging | `libs/platform-observability/src/audit.service.ts:10-24` | Audit writes metrics + contextual log together | `this.logger.logWithContext("log",` |
| Types | `libs/platform-auth/src/auth-context.ts:11-28` | Tenant-aware JWT and request context contracts are explicit TS types | `export type TenantRequestContext = { ... }` |
| Test | `test/auth-integration.test.mjs:38-58` | Nest test modules stub config/audit dependencies explicitly | `provide: AuditService, useValue: { record: () => undefined }` |
| Test | `test/identity-tenant-foundation-smoke.test.mjs:13-59` | Smoke tests read source files and assert architecture strings | `fs.readFileSync(...); assert.match(...)` |
| Config | `libs/platform-config/src/app-config.ts:91-149` | Config namespace factory returns nested per-app config objects | `createPlatformConfigNamespace(platformAppConfig.gateway)` |
| Dependency | `package.json:14-28` | Validation uses `build`, `lint`, `test`, and `db:validate` scripts | `"test": "npm run build && node --test test/*.test.mjs"` |
| Contract | `docs/architecture/adr-004-transport-and-eventing.md:13-28` | Sync over internal HTTP, async over NATS JetStream, versioned event payloads | `Event payload phải có version và correlation metadata` |
| Entry Point | `apps/gateway/src/graphql/graphql.module.ts:39-49` | GraphQL request context carries correlation and policy metadata | `context: ({ req }) => ({ req, correlation, ... })` |

---

## Codebase Analysis

### Entry Points
- Client enters through `GraphQL Gateway`, which builds GraphQL request context and correlation metadata in `apps/gateway/src/graphql/graphql.module.ts`.
- Authenticated HTTP entrypoints exist in `auth-service` and `user-service`, but gateway remains the client-facing orchestration layer.
- Phase 6 should therefore add readiness artifacts at architecture/contract level, and optionally gateway-facing schema placeholders only if they delegate to future downstream services rather than embedding accounting logic.

### Data Flow
- Login flow: `auth.controller` -> `AuthService` -> `AuthRepository` -> JWT claims -> gateway/user-service guards consume claims.
- Membership flow: guarded controller reads `TenantRequestContext`, verifies user boundary, returns `MembershipProjection`.
- GraphQL flow: request enters gateway -> request correlation created -> auth guard populates `req.user` -> resolver returns authenticated context.
- Phase 6 should document how future ledger/invoice/expense/reporting services consume the same `tenantId`, `membershipId`, `roles`, `permissions`, `requestId`, and `traceId` instead of introducing parallel context shapes.

### State Changes
- Current codebase is mostly fixture-backed; stateful persistence for auth and membership is intentionally deferred.
- Observable state changes today are audit metric increments and structured log emissions.
- Phase 6 should avoid inventing persistence prematurely; it should define ownership boundaries and lifecycle events that future services will implement against real storage.

### Contracts
- `TenantRequestContext` and `AuthTokenClaims` in `libs/platform-auth/src/auth-context.ts` are current cross-service identity contracts.
- Config and startup contracts are centralized in `libs/platform-config/src/app-config.ts`.
- Error envelopes are governed by ADR-005 even though a full adapter/filter layer is deferred.
- Eventing and internal HTTP direction are governed by ADR-004; phase 6 must refine them for accounting domains without contradicting prior ADRs.

### Patterns
- Repo favors small explicit Nest modules and direct imports over premature abstraction.
- Architecture work is captured as ADRs, PRP artifacts, and smoke tests that assert file presence and critical phrases.
- Cross-cutting concerns live in shared `libs/*` packages; app-specific domain boundaries live under `apps/*/src/*`.
- Minimal correct changes are preferred; for phase 6, that means readiness artifacts and validating tests before any real accounting implementation.

---

## Strategic Design

- **Approach**: Add architecture and contract artifacts for accounting-domain expansion, anchored in existing ADR/report style, then add smoke tests that enforce the new readiness decisions and update PRD/report status consistently.
- **Alternatives Considered**:
  - Add real `ledger-service` scaffolding now.
    - Rejected because PRD phase 6 is readiness and boundary definition, not domain implementation.
  - Put accounting schema placeholders directly inside `gateway` only.
    - Rejected because it would blur the service-expansion goal and risks turning gateway into a business-logic host.
  - Skip tests because this phase is “just docs”.
    - Rejected because prior architecture phases in this repo encode decisions with smoke tests, preventing silent drift.
- **Scope**:
  - Define bounded contexts for `ledger`, `invoice`, `expense`, `tax`, and `reporting`
  - Define recommended first-service rollout path and dependency order
  - Define high-level internal HTTP contract expectations and event taxonomy conventions for accounting domains
  - Define how auth, tenant, audit, and correlation metadata propagate into future domain services
  - Add artifact validation tests and phase report/PRD updates
- **NOT Building**:
  - Real accounting business logic, entities, or persistence models
  - Database schema migrations for accounting services
  - Live NATS producers/consumers for accounting events
  - New GraphQL mutations/queries backed by accounting workflows
  - Federation, CQRS projections, or policy-engine overhaul

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `docs/architecture/adr-006-accounting-domain-boundaries.md` | CREATE | Capture accepted domain boundaries and ownership rules for accounting expansion |
| `docs/architecture/accounting-domain-map.md` | CREATE | Provide implementation-facing bounded context map and dependency sequencing |
| `docs/contracts/accounting-service-expansion.md` | CREATE | Define internal HTTP, event metadata, and service expansion contract baseline |
| `test/accounting-domain-readiness-smoke.test.mjs` | CREATE | Enforce artifact existence and critical contractual phrases |
| `test/architecture-baseline-structure.test.mjs` | UPDATE | Extend required file checks to new readiness artifacts if keeping baseline structural test authoritative |
| `.claude/PRPs/reports/accounting-domain-readiness-report.md` | CREATE | Record actual implementation outcomes for phase 6 |
| `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | UPDATE | Advance phase 6 status to `complete` after implementation; for planning now it is `in-progress` |
| `.claude/PRPs/plans/accounting-domain-readiness.plan.md` | CREATE | This execution plan artifact |

## NOT Building

- `apps/ledger-service`
- `apps/invoice-service`
- `apps/expense-service`
- event broker runtime wiring for accounting domains
- GraphQL schema expansion for accounting workflows
- accounting DTOs/entities/repositories

---

## Step-by-Step Tasks

### Task 1: Reconfirm Phase 6 scope against existing ADRs and reports
- **ACTION**: Read PRD phase 6 and all foundation ADR/report artifacts before editing.
- **IMPLEMENT**: Extract immutable constraints: gateway stays orchestration-only, auth context shape is reused, observability metadata is mandatory, transport remains internal HTTP + NATS JetStream.
- **MIRROR**: `Mandatory Reading`, `Unified Discovery Table`, ADR/report writing style from existing docs.
- **IMPORTS**: None.
- **GOTCHA**: Do not redefine tenant or auth model; Phase 6 must build on ADR-002, not reopen it.
- **VALIDATE**: New artifacts contain no contradictions with ADR-002 through ADR-005.

### Task 2: Create an accepted ADR for accounting domain boundaries
- **ACTION**: Add `docs/architecture/adr-006-accounting-domain-boundaries.md`.
- **IMPLEMENT**: Follow existing ADR format with `Status`, `Context`, `Decision`, `Alternatives Considered`, `Consequences`, `Open Questions`. Define domain ownership for `ledger`, `invoice`, `expense`, `tax`, and `reporting`; specify that `auth-service` and `user-service` remain shared platform services; specify the recommended first domain to implement and why.
- **MIRROR**: Structure and tone from `docs/architecture/adr-002-auth-and-tenant-model.md` and `docs/architecture/adr-004-transport-and-eventing.md`.
- **IMPORTS**: None.
- **GOTCHA**: Keep the ADR at boundary/ownership level. Do not slip into table schemas, full endpoints, or accounting workflows.
- **VALIDATE**: Smoke test asserts the ADR contains domain names, tenant-aware ownership language, and preservation of gateway/auth/observability constraints.

### Task 3: Add an implementation-facing domain map document
- **ACTION**: Add `docs/architecture/accounting-domain-map.md`.
- **IMPLEMENT**: Include a concise matrix for each domain: purpose, owned data concepts, upstream/downstream dependencies, candidate service boundary, forbidden responsibilities, and recommended rollout order. Include a “first domain” recommendation, likely `ledger` or `invoice`, but anchor the recommendation to the PRD readiness goal.
- **MIRROR**: Decision-table style used in the PRD and ADR consequence sections.
- **IMPORTS**: None.
- **GOTCHA**: If `reporting` depends on data from multiple services, document it as a read/aggregation concern rather than a source-of-truth domain.
- **VALIDATE**: A reader can tell which service should own what without re-reading the PRD.

### Task 4: Define the accounting service expansion contract
- **ACTION**: Add `docs/contracts/accounting-service-expansion.md`.
- **IMPLEMENT**: Describe baseline internal HTTP envelope, required request/response metadata, event payload shape, versioning rule, and required correlation fields (`requestId`, `traceId`, `tenantId`, `userId`, `membershipId` when relevant). Add “must inherit existing auth context” and “must not trust tenant input from client” rules. Add gateway-facing integration expectations for future domain services.
- **MIRROR**: ADR-004 transport rules, ADR-005 error/config contract language, and request-correlation/audit field names from `libs/platform-observability` and `libs/platform-auth`.
- **IMPORTS**: None.
- **GOTCHA**: Keep this contract high-level and implementation-ready; do not invent API routes that may constrain later domain discovery too early.
- **VALIDATE**: Contract mentions sync/internal HTTP, async/NATS JetStream, versioned events, and public-safe error mapping.

### Task 5: Add structural smoke test coverage for readiness artifacts
- **ACTION**: Create `test/accounting-domain-readiness-smoke.test.mjs` and update `test/architecture-baseline-structure.test.mjs` if needed.
- **IMPLEMENT**: Use the repo’s `fs.readFileSync` + `assert.match` style to verify new files exist and contain critical strings such as domain names, internal HTTP, NATS JetStream, tenant-aware context, and event metadata requirements.
- **MIRROR**: `test/architecture-baseline-structure.test.mjs` and `test/identity-tenant-foundation-smoke.test.mjs`.
- **IMPORTS**: `node:test`, `node:assert/strict`, `node:fs`.
- **GOTCHA**: Keep tests resilient to wording changes by asserting essential phrases, not entire paragraphs.
- **VALIDATE**: `npm test` or targeted node test run passes without needing any live service runtime.

### Task 6: Write the phase implementation report
- **ACTION**: Add `.claude/PRPs/reports/accounting-domain-readiness-report.md` after implementation.
- **IMPLEMENT**: Follow prior report format: summary, tasks completed, validation results, files changed, deviations, issues, tests written, next steps.
- **MIRROR**: `.claude/PRPs/reports/gateway-hardening-report.md` and `.claude/PRPs/reports/observability-audit-foundation-report.md`.
- **IMPORTS**: None.
- **GOTCHA**: Report actual outcomes only; if implementation stays doc/test-only, say so explicitly.
- **VALIDATE**: Report references the actual files created and commands run.

### Task 7: Finalize PRD status and plan traceability
- **ACTION**: Update the PRD once implementation completes.
- **IMPLEMENT**: Change Phase 6 `Status` from `in-progress` to `complete`, replace `PRP Plan` `-` with the resulting report path or plan/report linkage consistent with current repo convention, and ensure plan/report references are accurate.
- **MIRROR**: Current PRD phase rows and prior completed phases.
- **IMPORTS**: None.
- **GOTCHA**: For this planning step only, set phase to `in-progress`; do not mark `complete` until implementation and validation finish.
- **VALIDATE**: PRD table is internally consistent and no remaining pending phases are incorrectly modified.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| readiness artifacts exist | required file paths | all files present | no |
| accounting ADR preserves tenant/auth constraints | ADR text | matches tenant-aware and gateway-orchestration rules | yes |
| domain map covers all planned domains | domain map text | includes ledger, invoice, expense, tax, reporting | no |
| expansion contract preserves transport/event rules | contract text | matches internal HTTP, NATS JetStream, versioned event metadata | yes |
| readiness docs preserve observability metadata | contract text | includes requestId, traceId, tenantId, userId | yes |

### Edge Cases Checklist
- [x] Empty input
- [ ] Maximum size input
- [x] Invalid types
- [x] Concurrent access
- [ ] Network failure (if applicable)
- [x] Permission denied

Notes:
- “Empty input” and “invalid types” apply to contract definitions for future service requests/events.
- “Concurrent access” applies to domain/event semantics, especially ledger posting and invoice state transitions; the docs should explicitly call out idempotency and ordering expectations where relevant.

---

## Validation Commands

### Static Analysis
```bash
npm run build
```
EXPECT: Zero type errors

### Unit Tests
```bash
node --test test/accounting-domain-readiness-smoke.test.mjs
```
EXPECT: All readiness smoke tests pass

### Full Test Suite
```bash
npm test
```
EXPECT: No regressions

### Database Validation
```bash
npm run db:validate
```
EXPECT: Schema up to date placeholder still passes

### Browser Validation
```bash
# N/A - internal architecture/documentation change
```
EXPECT: N/A

### Manual Validation
- [ ] Read `adr-006` and confirm it does not contradict ADR-002 through ADR-005
- [ ] Read `accounting-domain-map.md` and confirm every planned accounting domain has a clear ownership statement
- [ ] Read `accounting-service-expansion.md` and confirm auth, tenant, error, and observability metadata are specified
- [ ] Confirm tests only assert durable contract phrases, not brittle prose
- [ ] Confirm PRD phase references are updated correctly after implementation

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
- [ ] Self-contained - no questions needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Domain boundaries are too vague to guide the first accounting service | Medium | High | Require each domain artifact to state owned responsibilities, dependencies, and forbidden responsibilities |
| Plan drifts into premature implementation detail | Medium | Medium | Keep artifacts at boundary, contract, and sequencing level only |
| Gateway gets overloaded with future accounting orchestration assumptions | Medium | High | Reassert in ADR and contract docs that gateway remains orchestration-only |
| Event taxonomy becomes inconsistent with existing audit/security conventions | Low | Medium | Mirror ADR-004 naming and existing `auditEventTypes` correlation metadata |
| Structural tests become brittle prose checks | Medium | Low | Assert essential phrases and file existence only |

## Notes
- No external research is required because this phase extends already-accepted internal architecture decisions.
- The repo’s current pattern for architecture phases is “docs + smoke tests + report,” not immediate runtime-heavy implementation.
- The most likely single-pass implementation path is documentation-first with validation tests, then status/report updates.
