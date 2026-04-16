# Plan: Architecture Baseline

## Summary
Tài liệu này lập kế hoạch chi tiết cho phase `Architecture Baseline` của nền tảng kế toán multi-tenant dùng `NestJS microservices + central GraphQL Gateway`. Vì repo hiện chưa có codebase sản phẩm NestJS, plan này vừa là implementation plan vừa là context pack để dựng đúng monorepo structure, ADR set, shared contracts baseline, và các quyết định nền tảng cho auth, tenanting, eventing, config, và observability mà không cần tìm thêm trong codebase.

## User Story
As an engineering team building a multi-tenant accounting platform, I want a frozen architecture baseline for gateway, auth, user, tenancy, and observability, so that implementation can proceed consistently without redesigning platform foundations later.

## Problem → Solution
Chưa có baseline kiến trúc, repo chưa có product code, và các quyết định nền tảng có nguy cơ trôi dạt theo từng service → tạo một architecture baseline có thể thực thi được gồm workspace layout, ADRs, shared contracts boundaries, config strategy, auth/authz model, transport decisions, observability baseline, và acceptance checks cho phase đầu.

## Metadata
- **Complexity**: Large
- **Source PRD**: `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`
- **PRD Phase**: Architecture Baseline
- **Estimated Files**: 12

---

## UX Design

### Before
N/A — internal change

### After
N/A — internal change

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Engineering kickoff | Nhiều quyết định nền tảng còn mơ hồ | Có baseline architecture và ADRs rõ ràng | Thay đổi dành cho team nội bộ |
| New service creation | Dễ tự chọn pattern riêng | Phải bám workspace, provider, config, logging, tracing conventions đã chốt | Giảm divergence |
| Auth/tenant implementation | Có thể cấy tenant logic rải rác | Tenant context, RBAC, token model, audit taxonomy được chốt trước | Giảm rework |

---

## Mandatory Reading

Files that MUST be read before implementing:

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | 100-204 | Source of phase scope, architecture decisions, implementation phases, and risks |
| P0 (critical) | `.opencode/tsconfig.json` | 1-29 | Existing TypeScript baseline: strict mode, NodeNext, declaration/source maps |
| P0 (critical) | `.gitignore` | 1-27 | Existing repo assumptions include NestJS-style build artifacts and `.env` ignores |
| P1 (important) | `.opencode/package.json` | 1-73 | Existing workspace package conventions: ESM package, Node >=18, root-level scripts |
| P1 (important) | `.opencode/opencode.json` | 1-43 | Existing config organization style and root-level asset references |
| P1 (important) | `.opencode/index.ts` | 37-80 | Export style and metadata conventions for TypeScript modules in this workspace |
| P1 (important) | `.opencode/tools/run-tests.ts` | 12-141 | Real TypeScript naming, helper function, and tool-definition structure |
| P1 (important) | `.opencode/tools/lint-check.ts` | 11-87 | Naming and pure-function composition style used in workspace |
| P1 (important) | `.opencode/plugins/ecc-hooks.ts` | 26-91 | Type aliases, local helper functions, and lightweight logging helper style |
| P2 (reference) | `.opencode/plugins/lib/changed-files-store.ts` | 1-98 | Shared utility organization and export patterns |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Nest CLI monorepo | `docs.nestjs.com/cli/monorepo` | Use Nest workspace mode with apps under `apps/` and shared libs under `libs/`; this is a CLI/workspace concern and fits multiple deployables |
| Nest GraphQL quick start | `docs.nestjs.com/graphql/quick-start` | Use `GraphQLModule` with explicit driver; code-first is the natural fit for TypeScript-first gateway design |
| Nest logger | `docs.nestjs.com/techniques/logger` | Use DI-managed custom logger and `app.useLogger(app.get(...))`; pair with `bufferLogs: true` at bootstrap |
| Nest custom providers/dynamic modules | `docs.nestjs.com/fundamentals/custom-providers` | Shared cross-cutting concerns should be built as providers and dynamic modules with exported tokens |
| OpenTelemetry Node.js | `opentelemetry.io/docs/languages/js/getting-started/nodejs/` | Instrumentation must start before app code; use SDK bootstrap and exporter configuration early |

---

## Patterns to Mirror

Code patterns discovered in the codebase. Follow these exactly where applicable.

### NAMING_CONVENTION
// SOURCE: `.opencode/tools/run-tests.ts:12-18`, `.opencode/tools/lint-check.ts:13-18`, `.opencode/plugins/lib/changed-files-store.ts:8-12`
```ts
const runTestsTool: ToolDefinition = tool({
  description:
    "Run the test suite with optional coverage, watch mode, or specific test patterns. Automatically detects package manager (npm, pnpm, yarn, bun) and test framework.",
  args: {
    pattern: tool.schema
      .string()
```

```ts
const lintCheckTool: ToolDefinition = tool({
  description:
    "Detect linter for a target path and return command for check/fix runs.",
```

```ts
export function initStore(worktree: string): void {
  worktreeRoot = worktree || process.cwd()
}
```

Observed pattern:
- `camelCase` for functions and locals
- `PascalCase` for exported type aliases and constants representing higher-order modules
- descriptive `const` names ending with role suffixes such as `Tool`

### ERROR_HANDLING
// SOURCE: `.opencode/tools/run-tests.ts:122-137`, `.opencode/plugins/ecc-hooks.ts:107-112`, `.opencode/plugins/ecc-hooks.ts:165-175`
```ts
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      if (deps.vitest) return "vitest"
      if (deps.jest) return "jest"
    } catch {
      // Ignore parse errors
    }
  }
```

```ts
        try {
          await $`prettier --write ${event.path} 2>/dev/null`
          log("info", `[ECC] Formatted: ${event.path}`)
        } catch {
          // Prettier not installed or failed - silently continue
        }
```

Observed pattern:
- narrow `try/catch` around optional or best-effort actions
- ignore recoverable detection failures with comments
- when surfacing diagnostics, log warnings instead of crashing helper paths

### LOGGING_PATTERN
// SOURCE: `.opencode/plugins/ecc-hooks.ts:55-57`, `.opencode/plugins/ecc-hooks.ts:121-124`, `.opencode/plugins/ecc-hooks.ts:275-281`
```ts
const log = (level: "debug" | "info" | "warn" | "error", message: string) =>
  client.app.log({ body: { service: "ecc", level, message } })
```

```ts
log(
  "warn",
  `[ECC] console.log found in ${event.path} (${lines} occurrence${lines > 1 ? "s" : ""})`
)
```

```ts
log("info", `[ECC] Session started - profile=${currentProfile}`)
```

Observed pattern:
- structured logging wrapper with service + level + message
- log concise operational messages
- warnings for policy violations, info for successful hooks, avoid noisy payload dumping

### REPOSITORY_PATTERN
// SOURCE: `.opencode/plugins/lib/changed-files-store.ts:22-30`, `.opencode/plugins/lib/changed-files-store.ts:66-73`
```ts
export function recordChange(filePath: string, type: ChangeType): void {
  const rel = toRelative(filePath)
  if (!rel) return
  changes.set(rel, type)
}

export function getChanges(): Map<string, ChangeType> {
  return new Map(changes)
}
```

```ts
export function buildTree(filter?: ChangeType): TreeNode[] {
  const root: TreeNode[] = []
  for (const [relPath, changeType] of changes) {
```

Observed pattern:
- stateful utility modules expose small pure-ish helper functions
- avoid classes unless needed
- return copies instead of leaking mutable internals

For the future NestJS product code, adapt this into repository/provider modules with explicit exported functions or injectable classes, but keep APIs small and single-purpose.

### SERVICE_PATTERN
// SOURCE: `.opencode/plugins/ecc-hooks.ts:26-33`, `.opencode/tools/run-tests.ts:33-41`
```ts
type ECCHooksPluginFn = (input: PluginInput) => Promise<Record<string, unknown>>

export const ECCHooksPlugin: ECCHooksPluginFn = async ({
  client,
  $,
  directory,
  worktree,
}: PluginInput) => {
```

```ts
  async execute(args, context) {
    const { pattern, coverage, watch, updateSnapshots } = args
    const cwd = context.worktree || context.directory

    const packageManager = await detectPackageManager(cwd)
    const testFramework = await detectTestFramework(cwd)
```

Observed pattern:
- thin orchestrator entrypoints
- dependency/context extraction at the top
- helper functions perform detail work
- return structured data rather than side effects when possible

Translate this into NestJS services/controllers/resolvers by keeping bootstrap/resolver/controller code thin and pushing logic into dedicated providers.

### TEST_STRUCTURE
No internal application test structure exists in this repo for the target product code. There are no first-party `*.spec.ts` or app-level test files to mirror.

Baseline to establish during implementation:
- unit tests co-located or under per-app `test/`
- `*.spec.ts` naming
- one integration smoke suite per app for bootstrap/config/health
- auth/authz tests for protected routes and GraphQL operations

This absence is itself a critical planning input: the implementation must define the initial NestJS testing convention.

---

## Unified Discovery Table

| Category | File:Lines | Pattern | Key Snippet |
|---|---|---|---|
| Naming | `.opencode/tools/run-tests.ts:12-18` | Descriptive `const` module names and fluent schema definitions | `const runTestsTool: ToolDefinition = tool({` |
| Naming | `.opencode/plugins/lib/changed-files-store.ts:8-12` | `camelCase` exported helper functions | `export function initStore(worktree: string): void {` |
| Error | `.opencode/tools/run-tests.ts:122-137` | Ignore recoverable parse errors | `} catch { // Ignore parse errors }` |
| Error | `.opencode/plugins/ecc-hooks.ts:165-175` | Log warnings instead of throwing in diagnostic paths | `log("warn", "[ECC] TypeScript errors detected:")` |
| Logging | `.opencode/plugins/ecc-hooks.ts:55-57` | Structured service logging wrapper | `client.app.log({ body: { service: "ecc", level, message } })` |
| Types | `.opencode/plugins/lib/changed-files-store.ts:3-6` | Small exported union/types near module logic | `export type ChangeType = "added" | "modified" | "deleted"` |
| Config | `.opencode/opencode.json:1-21` | Root config file with referenced assets | `"instructions": [ ... ], "plugin": ["./plugins"]` |
| Dependencies | `.opencode/package.json:30-34` | Root-level scripts and ESM package setup | `"build": "tsc"` |
| Entry point | `.opencode/index.ts:37-44` | Re-export root module and metadata | `export { ECCHooksPlugin, default } from "./plugins/index.js"` |
| Data flow | `.opencode/tools/run-tests.ts:33-41` | Parse args, inspect context, then delegate helpers | `const cwd = context.worktree || context.directory` |

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | UPDATE | Mark `Architecture Baseline` as `in-progress` and attach the plan path |
| `package.json` | CREATE | Root workspace manifest for Nest monorepo and shared scripts |
| `nest-cli.json` | CREATE | Nest workspace definition and project mapping |
| `tsconfig.json` | CREATE | Root TS config for apps/libs |
| `tsconfig.build.json` | CREATE | Build-specific TS config baseline |
| `apps/gateway/package-metadata placeholder via generated Nest app files` | CREATE | Gateway app skeleton target |
| `apps/auth-service/...` | CREATE | Auth service skeleton target |
| `apps/user-service/...` | CREATE | User service skeleton target |
| `libs/platform-config/...` | CREATE | Shared config module and provider tokens |
| `libs/platform-logger/...` | CREATE | Shared logger module and bootstrap integration |
| `libs/platform-observability/...` | CREATE | OTel/tracing/metrics bootstrap module |
| `docs/architecture/adr-001-workspace-structure.md` | CREATE | Record monorepo and deployable structure decision |
| `docs/architecture/adr-002-auth-and-tenant-model.md` | CREATE | Record auth, tenant, membership, and RBAC baseline |
| `docs/architecture/adr-003-observability-baseline.md` | CREATE | Record logging, tracing, metrics, and audit baselines |
| `docs/architecture/adr-004-transport-and-eventing.md` | CREATE | Record sync HTTP and async NATS decisions |
| `docs/architecture/adr-005-error-and-config-contracts.md` | CREATE | Record config and error contract conventions |

## NOT Building

- Ledger, invoice, expense, tax, or reporting business services
- Apollo Federation or subgraph split
- Database-per-tenant or schema-per-tenant isolation
- Full OIDC/SSO implementation
- Production-grade deployment manifests for Kubernetes/Terraform beyond the minimal architecture notes needed to anchor conventions
- CQRS/read-model subsystem

---

## Step-by-Step Tasks

### Task 1: Freeze baseline decisions from the PRD
- **ACTION**: Convert phase scope from PRD into explicit architecture deliverables and acceptance boundaries.
- **IMPLEMENT**: Enumerate the exact outputs of `Architecture Baseline`: workspace structure, ADRs, config contracts, auth/tenant model, observability baseline, transport/eventing baseline, and validation checklist.
- **MIRROR**: `SERVICE_PATTERN` for thin orchestration of inputs from the PRD.
- **IMPORTS**: N/A — documentation task.
- **GOTCHA**: Do not let phase 1 drift into service implementation or schema design for accounting domains.
- **VALIDATE**: Every deliverable in the phase maps directly back to PRD lines `155-158` and does not overlap with `Platform Skeleton` implementation work in lines `160-163`.

### Task 2: Define Nest workspace target structure
- **ACTION**: Specify the exact monorepo layout to be generated in implementation.
- **IMPLEMENT**: Root `package.json`, `nest-cli.json`, `tsconfig` pair, `apps/gateway`, `apps/auth-service`, `apps/user-service`, and shared `libs/*` for config/logger/observability/common contracts.
- **MIRROR**: `NAMING_CONVENTION` and Nest monorepo docs.
- **IMPORTS**: Planned dependencies only: `@nestjs/*`, `graphql`, `@nestjs/graphql`, `@apollo/server` or supported Nest driver, `class-validator`, `class-transformer`, `@nestjs/config`, `pino` integration, OTel packages.
- **GOTCHA**: Nest CLI monorepo conversion expects canonical layout; since repo is greenfield, create workspace natively instead of trying to convert existing non-Nest structure.
- **VALIDATE**: Resulting target layout supports three deployable apps and shared libs without circular dependencies.

### Task 3: Define config strategy and provider model
- **ACTION**: Decide how services receive environment config and shared platform options.
- **IMPLEMENT**: Plan a shared config library using custom provider tokens and dynamic module registration; define per-app env schemas and a rule that bootstrap fails fast on missing required config.
- **MIRROR**: Nest `custom providers` guidance and local `SERVICE_PATTERN` of thin entrypoint plus helper modules.
- **IMPORTS**: `@nestjs/config`, `ConfigurableModuleBuilder` or `forRoot/forRootAsync`, validation library such as `zod` or `class-validator`.
- **GOTCHA**: Do not use ad hoc `process.env` reads deep in services; centralize env parsing to avoid config drift.
- **VALIDATE**: Every planned cross-cutting module has explicit provider exports and no hidden global singleton assumptions.

### Task 4: Define auth, tenant, membership, and RBAC baseline
- **ACTION**: Freeze identity boundaries before any service code is written.
- **IMPLEMENT**: Document global `User`, tenant-scoped `Membership`, tenant-scoped roles/permissions, JWT access + refresh model, downstream tenant context propagation, and the rule that client-provided tenant context is never trusted blindly.
- **MIRROR**: PRD decisions log plus `ERROR_HANDLING` style of explicit guarded paths.
- **IMPORTS**: Planned only: `@nestjs/jwt`, `passport`, `passport-jwt`, crypto/password package such as `argon2` or `bcrypt`, validation library.
- **GOTCHA**: Avoid locking into global RBAC or request-scoped provider sprawl too early; keep request context explicit and cheap.
- **VALIDATE**: The model supports one user in multiple tenants and keeps all authorization tenant-scoped by default.

### Task 5: Define transport and eventing baseline
- **ACTION**: Freeze sync and async communication standards for phase 1.
- **IMPLEMENT**: Document `GraphQL client -> gateway`, `HTTP internal service-to-service`, `NATS JetStream for audit/security/lifecycle events`, timeout expectations, correlation metadata shape, and event naming/versioning rules.
- **MIRROR**: `LOGGING_PATTERN` plus PRD decisions log.
- **IMPORTS**: Planned only: Nest microservice transport packages or HTTP client layer, `nats` client where needed.
- **GOTCHA**: Do not overuse async messaging for login or token validation; keep hot auth paths synchronous.
- **VALIDATE**: All current phase-1 flows can be represented without adding Kafka, gRPC, or federation.

### Task 6: Define observability baseline
- **ACTION**: Turn observability from a principle into concrete conventions.
- **IMPLEMENT**: Document structured log shape, logger abstraction, trace bootstrap order, metric naming domains, correlation IDs, trace propagation over HTTP and events, and mandatory dashboards for gateway/auth/user.
- **MIRROR**: `LOGGING_PATTERN`, Nest logger docs, OpenTelemetry bootstrap guidance.
- **IMPORTS**: Planned only: `pino`, Nest pino adapter, `@opentelemetry/sdk-node`, `@opentelemetry/api`, exporter packages, Prometheus metrics integration.
- **GOTCHA**: OTel instrumentation must initialize before app code; logger must be DI-backed and attached with `bufferLogs: true` if startup logs matter.
- **VALIDATE**: A future implementation can bootstrap each app with the same log/trace/metric baseline without custom per-service invention.

### Task 7: Define error and API contract baseline
- **ACTION**: Establish the shape of platform-level errors and health contracts.
- **IMPLEMENT**: Document standard error envelope for internal HTTP calls, GraphQL error mapping policy, health/readiness endpoint expectations, and what metadata every error/log entry must carry.
- **MIRROR**: `ERROR_HANDLING` pattern: narrow catch blocks and explicit warning paths rather than silent swallowing in request paths.
- **IMPORTS**: Planned only: Nest exception filters, health module package if chosen, validation packages.
- **GOTCHA**: Do not leak internal stack traces or auth secrets through GraphQL or internal service boundaries.
- **VALIDATE**: Contracts are usable by gateway, auth, and user apps without custom branching.

### Task 8: Create ADR set and docs structure
- **ACTION**: Materialize architecture baseline as ADRs rather than leaving it in chat context.
- **IMPLEMENT**: Write at least 5 ADRs covering workspace structure, auth/tenant model, observability baseline, transport/eventing, and config/error contracts.
- **MIRROR**: `NAMING_CONVENTION` for descriptive file names and `.opencode/opencode.json` pattern of root-level referenced assets.
- **IMPORTS**: N/A — markdown docs.
- **GOTCHA**: ADRs should record decisions, alternatives, and rationale; not generic essays.
- **VALIDATE**: Each unresolved risk from the PRD has either a decision or an explicit open question captured in an ADR.

### Task 9: Define implementation acceptance gates for the next phase
- **ACTION**: Prepare the project so `Platform Skeleton` can start with minimal ambiguity.
- **IMPLEMENT**: Add checklist for generated apps/libs, mandatory scripts, test scaffolding baseline, and validation commands that phase 2 must satisfy.
- **MIRROR**: `Unified Discovery Table` mindset and `run-tests`/`lint-check` utility pattern of explicit command generation.
- **IMPORTS**: Planned only: Nest CLI, package manager scripts, test framework selection.
- **GOTCHA**: Do not leave package manager, test runner, or logger choice implicit.
- **VALIDATE**: After reading the baseline docs, another engineer should be able to scaffold the monorepo without asking architecture questions.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| ADR completeness review | Architecture Baseline deliverables | Every required decision is captured in an ADR or explicit open question | No |
| Workspace structure review | Proposed apps/libs layout | No circular dependency risk and all deployables have a clear owner | Yes |
| Tenant model review | User, Tenant, Membership, Role, Permission entities | Tenant scope is explicit and no global authz shortcut remains | Yes |
| Observability contract review | Log/trace/metric schema | Required correlation fields and service identity fields are present | Yes |
| Config contract review | Env matrix per service | No required variable is undocumented; startup failure policy is defined | Yes |

### Edge Cases Checklist
- [ ] Empty environment variable set at bootstrap
- [ ] User belongs to multiple tenants
- [ ] Missing or stale tenant context in downstream request
- [ ] Event published without correlation metadata
- [ ] Auth service unavailable during gateway auth path
- [ ] GraphQL operation triggers an internal HTTP timeout
- [ ] Sensitive values appear in logs by mistake
- [ ] Future service needs additional permissions without changing JWT base model

---

## Validation Commands

### Static Analysis
```bash
# Run type checker once workspace skeleton exists
npm run build
```
EXPECT: Zero type errors

### Unit Tests
```bash
# Run tests once baseline project test runner exists
npm test
```
EXPECT: All tests pass

### Full Test Suite
```bash
# Run complete test suite for all apps/libs once scaffolded
npm test
```
EXPECT: No regressions

### Database Validation (if applicable)
```bash
# Validate schema toolchain once auth and user persistence is scaffolded
npm run db:validate
```
EXPECT: Schema toolchain configured and validation passes

### Browser Validation (if applicable)
```bash
# Start gateway locally once GraphQL app exists
npm run start:gateway
```
EXPECT: Gateway boots with logger/config baseline and exposes GraphQL endpoint/health checks

### Manual Validation
- [ ] Confirm `Architecture Baseline` phase status is `in-progress` in the PRD and references this plan file
- [ ] Confirm the plan contains all root files and ADRs needed before coding phase 2
- [ ] Confirm package manager choice, test runner choice, and logger/OTel choices are explicit
- [ ] Confirm `gateway`, `auth-service`, and `user-service` boundaries are stated and no accounting services are included
- [ ] Confirm all open product questions from the PRD remain visible and not silently assumed away

---

## Acceptance Criteria
- [ ] All tasks completed
- [ ] All validation commands pass or are explicitly staged for post-scaffold execution
- [ ] Tests written and passing for generated architecture modules once implementation begins
- [ ] No type errors
- [ ] No lint errors
- [ ] Matches UX design (if applicable)

## Completion Checklist
- [ ] Code and docs follow discovered TypeScript/ESM patterns where applicable
- [ ] Error handling matches documented baseline style
- [ ] Logging follows structured logging conventions
- [ ] Tests follow an explicitly defined Nest baseline pattern
- [ ] No hardcoded secrets or tenant assumptions
- [ ] Documentation updated
- [ ] No unnecessary scope additions
- [ ] Self-contained — no questions needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Repo has no product code to mirror directly | High | High | Use official Nest guidance plus existing TypeScript workspace conventions; document all target patterns explicitly |
| Architecture baseline accidentally expands into implementation | Medium | High | Keep outputs to ADRs, workspace skeleton decisions, and contracts only |
| Auth/tenant decisions made without validated business answers | Medium | High | Preserve open questions in ADRs and choose extensible defaults rather than brittle assumptions |
| Toolchain choice drifts during implementation | Medium | Medium | Freeze package manager, test runner, logger, and config strategy in baseline docs |
| Observability remains aspirational, not enforceable | Medium | High | Require exact log fields, trace propagation rules, and dashboards in ADR-003 |

## Notes
- Next executable phase after this plan should scaffold the Nest monorepo and baseline libraries, not implement business logic.
- Because the repo is greenfield, the most important implementation artifact of this phase is not code volume but the quality and completeness of the frozen decisions.
- Use code-first GraphQL for the gateway unless a later product constraint demands schema-first or federation.
