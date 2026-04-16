# Plan: Platform Skeleton

## Summary
Phase `Platform Skeleton` sẽ biến architecture baseline thành một NestJS monorepo có thể chạy và kiểm chứng được ở mức kỹ thuật tối thiểu: `gateway`, `auth-service`, `user-service`, shared platform libraries, config bootstrap, health/readiness surface, và test/bootstrap patterns. Mục tiêu không phải là triển khai business logic auth hay user domain hoàn chỉnh, mà là dựng khung kỹ thuật thật để phase `Identity & Tenant Foundation` và `Observability & Audit Foundation` có chỗ bám rõ ràng và không phải tái cấu trúc bootstrap về sau.

## User Story
As an engineering team implementing the accounting platform foundation, I want runnable NestJS app skeletons and shared platform modules, so that later identity, tenancy, and observability features can be added on top of a stable technical scaffold.

## Problem → Solution
Hiện repo mới có baseline manifests, ADRs, và placeholder TypeScript files nhưng chưa có NestJS runtime scaffold thật → dựng đầy đủ app/module/bootstrap skeleton cho `gateway`, `auth-service`, `user-service`, cùng config, health, test, và shared module boundaries để hệ thống có thể build, boot, và smoke-test độc lập.

## Metadata
- **Complexity**: Large
- **Source PRD**: `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`
- **PRD Phase**: Platform Skeleton
- **Estimated Files**: 25

---

## UX Design

### Before
N/A — internal change

### After
N/A — internal change

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Monorepo apps | Mới chỉ có placeholder TypeScript constants | Có app bootstrap NestJS thật với `main.ts`, `AppModule`, và health surface | Internal platform change |
| Shared libraries | Mới chỉ có baseline constants/types | Có shared modules/providers có thể import vào app thật | Giảm duplicate bootstrap code |
| Validation | Mới có structure test | Có smoke tests cho app/module bootstrapping | Tạo nền cho phase sau |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | 160-204 | Defines Platform Skeleton scope, success signal, and decisions log |
| P0 (critical) | `.claude/PRPs/reports/architecture-baseline-report.md` | 18-80 | Shows what phase 1 actually delivered and the deviations now part of reality |
| P0 (critical) | `nest-cli.json` | 1-68 | Current project map for apps and libs that phase 2 must flesh out |
| P0 (critical) | `package.json` | 1-23 | Current root scripts and package manager baseline |
| P0 (critical) | `docs/architecture/adr-001-workspace-structure.md` | 11-48 | Frozen workspace boundary decisions |
| P0 (critical) | `docs/architecture/adr-005-error-and-config-contracts.md` | 11-45 | Config and error contract decisions phase 2 must honor |
| P1 (important) | `libs/platform-config/src/index.ts` | 1-22 | Existing config tokens and baseline assumptions |
| P1 (important) | `libs/platform-logger/src/index.ts` | 1-22 | Existing logger field contract to preserve during module scaffolding |
| P1 (important) | `libs/platform-observability/src/index.ts` | 1-24 | Existing telemetry header and backend assumptions |
| P1 (important) | `test/architecture-baseline-structure.test.mjs` | 1-63 | Current validation style and structural coverage baseline |
| P2 (reference) | `.opencode/tools/run-tests.ts` | 12-141 | Real workspace TypeScript naming/helper style |
| P2 (reference) | `.opencode/plugins/ecc-hooks.ts` | 55-91 | Existing lightweight structured logging helper and small-function style |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Nest workspace bootstrap/module structure | `docs.nestjs.com/cli/monorepo` | Each runnable app should have its own `main.ts`, `AppModule`, and `tsconfig.app.json`, while shared libs stay under `libs/` |
| GraphQLModule for code-first Apollo gateway | `docs.nestjs.com/graphql/quick-start` | Use `GraphQLModule` with explicit `ApolloDriver`; prefer `forRootAsync()` and `autoSchemaFile` for code-first gateway setup |
| ConfigModule and env validation | `docs.nestjs.com/techniques/configuration` | Use `ConfigModule.forRoot({ isGlobal: true, validationSchema/validate })` and namespace config with `registerAs()` |
| Health/readiness with Terminus | `docs.nestjs.com/recipes/terminus` | Use `@nestjs/terminus` for health/readiness endpoints and enable shutdown hooks |
| Testing bootstrap patterns | `docs.nestjs.com/fundamentals/testing` | Use `Test.createTestingModule(...).compile()` for modules and `createNestApplication().init()` for smoke/e2e tests |

---

## Patterns to Mirror

### NAMING_CONVENTION
// SOURCE: `libs/platform-config/src/index.ts:1-7`, `libs/platform-logger/src/index.ts:1-4`, `.opencode/tools/lint-check.ts:13-18`
```ts
export const platformConfigModuleName = "platform-config" as const

export const platformConfigTokens = {
  appConfig: "platform.config.app",
  authConfig: "platform.config.auth",
  observabilityConfig: "platform.config.observability",
} as const
```

```ts
export const platformLoggerModuleName = "platform-logger" as const

export const platformLoggerFields = [
  "timestamp",
```

```ts
const lintCheckTool: ToolDefinition = tool({
  description:
    "Detect linter for a target path and return command for check/fix runs.",
```

Observed pattern:
- exported `const` names are explicit, descriptive, and domain-prefixed
- token objects use dot-separated string values
- file/module names align closely with directory purpose

### ERROR_HANDLING
// SOURCE: `.opencode/tools/run-tests.ts:122-137`, `.opencode/plugins/ecc-hooks.ts:118-127`, `docs/architecture/adr-005-error-and-config-contracts.md:13-24`
```ts
    } catch {
      // Ignore parse errors
    }
```

```ts
        } catch {
          // No console.log found (grep returns non-zero) - this is good
        }
```

```md
- Internal HTTP errors phải có envelope thống nhất tối thiểu gồm:
  - `code`
  - `message`
  - `status`
  - `requestId`
  - `traceId`
  - `details` tùy chọn
```

Observed pattern:
- optional/discovery paths fail softly
- request/runtime paths should use explicit contracts, not silent swallowing
- phase 2 should establish error filter/adapters, not ad hoc throws scattered per app

### LOGGING_PATTERN
// SOURCE: `.opencode/plugins/ecc-hooks.ts:55-57`, `libs/platform-logger/src/index.ts:18-22`
```ts
const log = (level: "debug" | "info" | "warn" | "error", message: string) =>
  client.app.log({ body: { service: "ecc", level, message } })
```

```ts
export const platformLoggerBaseline = {
  implementation: "di-managed-pino-adapter",
  bufferLogsAtBootstrap: true,
  redactFields: ["password", "accessToken", "refreshToken", "authorization"],
} as const
```

Observed pattern:
- structured logging with explicit service identity
- concise metadata over arbitrary object dumps
- phase 2 should scaffold logger module/bootstrap hook that preserves these fields and redaction assumptions

### REPOSITORY_PATTERN
// SOURCE: `.opencode/plugins/lib/changed-files-store.ts:22-30`, `libs/platform-config/src/index.ts:9-16`
```ts
export function getChanges(): Map<string, ChangeType> {
  return new Map(changes)
}
```

```ts
export type RequiredEnvironmentVariable = {
  name: string
  description: string
  required: boolean
}
```

Observed pattern:
- keep data contracts small and exported close to their module
- return copies or immutable constants instead of exposing mutable internals
- phase 2 repositories should remain minimal; avoid overbuilding repository abstraction before persistence logic exists

### SERVICE_PATTERN
// SOURCE: `.opencode/tools/run-tests.ts:33-41`, `.opencode/plugins/ecc-hooks.ts:26-33`
```ts
  async execute(args, context) {
    const { pattern, coverage, watch, updateSnapshots } = args
    const cwd = context.worktree || context.directory

    const packageManager = await detectPackageManager(cwd)
    const testFramework = await detectTestFramework(cwd)
```

```ts
export const ECCHooksPlugin: ECCHooksPluginFn = async ({
  client,
  $,
  directory,
  worktree,
}: PluginInput) => {
```

Observed pattern:
- entrypoints extract context first
- helper utilities encapsulate detail work
- phase 2 Nest bootstrap should keep `main.ts` thin and move setup into modules/shared providers

### TEST_STRUCTURE
// SOURCE: `test/architecture-baseline-structure.test.mjs:23-63`
```js
test("architecture baseline files exist", () => {
  for (const filePath of requiredFiles) {
    assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`)
  }
})
```

```js
test("nest workspace includes baseline applications and libraries", () => {
  const nestCli = JSON.parse(fs.readFileSync("nest-cli.json", "utf8"))

  assert.equal(nestCli.monorepo, true)
```

Observed pattern:
- current repo-root validation uses `node:test` with explicit assertions
- phase 2 should keep this lightweight structural validation and add Nest module/app smoke tests rather than jumping straight to heavy e2e tooling

---

## Unified Discovery Table

| Category | File:Lines | Pattern | Key Snippet |
|---|---|---|---|
| Similar implementation | `apps/gateway/src/main.ts:1-7` | App placeholder defines role/status as explicit constants | `role: "client-entrypoint"` |
| Naming | `libs/platform-config/src/index.ts:1-7` | Domain-prefixed exported constants and token objects | `platformConfigTokens` |
| Error | `docs/architecture/adr-005-error-and-config-contracts.md:13-24` | Internal error envelope and fail-fast startup rules | `Service code không được tự đọc process.env` |
| Logging | `libs/platform-logger/src/index.ts:18-22` | DI-managed pino baseline and redaction defaults | `bufferLogsAtBootstrap: true` |
| Type definitions | `libs/platform-observability/src/index.ts:9-16` | Exported literal arrays and derived union types | `PlatformTraceHeader` |
| Test patterns | `test/architecture-baseline-structure.test.mjs:23-63` | `node:test` + `assert` structure checks | `test("nest workspace includes baseline applications...` |
| Configuration | `package.json:14-21` | Root scripts already define `build`, `test`, `lint`, `db:validate` | `"build": "node ./.opencode/node_modules/typescript/bin/tsc...` |
| Dependencies | `package.json:1-23` | Root package currently dependency-free and uses npm workspaces | `"packageManager": "npm@10"` |
| Entry Points | `nest-cli.json:12-67` | Three apps and three libs already mapped as projects | `"gateway": { "type": "application" ... }` |
| Data Flow | `libs/platform-config/src/index.ts:18-22` | Config assumptions are centralized as exported baseline values | `validationStrategy: "startup-schema-validation"` |

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | UPDATE | Mark `Platform Skeleton` as `in-progress` and attach plan path |
| `package.json` | UPDATE | Add real phase-2 scripts for app-specific build/start/test once dependencies are added |
| `nest-cli.json` | UPDATE | Add any needed assets/compiler options for real Nest apps |
| `tsconfig.json` | UPDATE | Include test typing or path aliases if needed for app/lib imports |
| `tsconfig.build.json` | UPDATE | Exclude generated test files/spec files correctly |
| `apps/gateway/src/main.ts` | UPDATE | Replace placeholder with Nest bootstrap |
| `apps/gateway/src/app.module.ts` | CREATE | Root gateway module |
| `apps/gateway/src/health/health.module.ts` | CREATE | Gateway health/readiness surface |
| `apps/gateway/src/graphql/graphql.module.ts` | CREATE | GraphQL bootstrap module |
| `apps/auth-service/src/main.ts` | UPDATE | Replace placeholder with Nest bootstrap |
| `apps/auth-service/src/app.module.ts` | CREATE | Root auth module |
| `apps/auth-service/src/health/health.module.ts` | CREATE | Auth health/readiness surface |
| `apps/user-service/src/main.ts` | UPDATE | Replace placeholder with Nest bootstrap |
| `apps/user-service/src/app.module.ts` | CREATE | Root user module |
| `apps/user-service/src/health/health.module.ts` | CREATE | User health/readiness surface |
| `libs/platform-config/src/index.ts` | UPDATE | Turn baseline constants into actual shared config module/provider exports |
| `libs/platform-config/src/app-config.ts` | CREATE | App-level config namespace and validation helpers |
| `libs/platform-logger/src/index.ts` | UPDATE | Export actual shared logger module/provider surface |
| `libs/platform-observability/src/index.ts` | UPDATE | Export real bootstrap helpers/module placeholders |
| `libs/platform-health/src/index.ts` | CREATE | Shared health module/helpers if extraction makes structure cleaner |
| `test/architecture-baseline-structure.test.mjs` | UPDATE | Extend structural assertions for new app/module files |
| `test/platform-skeleton-smoke.test.mjs` | CREATE | Verify generated files and scripts for phase 2 scaffold |

## NOT Building

- Login, JWT issuance, refresh tokens, guards, or RBAC business enforcement
- GraphQL resolvers for real auth/user business operations beyond skeleton readiness
- Database models, migrations, or ORM integration
- NATS producers/consumers or audit pipelines
- OpenTelemetry runtime wiring beyond skeleton-ready module/provider boundaries
- Rate limiting, complexity guards, or security hardening from phase 5

---

## Step-by-Step Tasks

### Task 1: Upgrade root workspace scripts for real app scaffolding
- **ACTION**: Replace placeholder root scripts with phase-2 scripts that can build, test, and start scaffolded Nest apps.
- **IMPLEMENT**: Add scripts such as `start:gateway`, `start:auth-service`, `start:user-service`, and any app-targeted build/test helpers while keeping existing `build`, `test`, and `lint` stable.
- **MIRROR**: `NAMING_CONVENTION` and current `package.json` script structure.
- **IMPORTS**: Planned dependencies include Nest CLI/runtime packages and any chosen test runner utilities.
- **GOTCHA**: Do not break phase-1 architecture tests; extend scripts rather than replacing validation coverage.
- **VALIDATE**: `package.json` contains explicit scripts for each app and root checks still pass.

### Task 2: Replace placeholder app entrypoints with real Nest bootstraps
- **ACTION**: Implement thin `main.ts` files for `gateway`, `auth-service`, and `user-service`.
- **IMPLEMENT**: Each app bootstrap should create a Nest application, load shared config/logger modules, enable shutdown hooks, and expose a stable health surface.
- **MIRROR**: `SERVICE_PATTERN` and Nest workspace bootstrap guidance.
- **IMPORTS**: `@nestjs/core`, app `AppModule`, shared config/logger helpers.
- **GOTCHA**: Keep `main.ts` thin; do not embed business logic or config parsing directly in bootstrap.
- **VALIDATE**: Type-check passes and each app has a clear bootstrap path with no placeholder constants left behind.

### Task 3: Create root AppModule per service with strict boundaries
- **ACTION**: Add `AppModule` for gateway, auth-service, and user-service.
- **IMPLEMENT**: Import only the shared cross-cutting modules needed for phase 2 plus local health/graphql modules; keep domain feature modules minimal or empty shells.
- **MIRROR**: `REPOSITORY_PATTERN` for small exported contracts and `SERVICE_PATTERN` for thin orchestration.
- **IMPORTS**: `@nestjs/common`, shared libs from `libs/platform-*`, local modules.
- **GOTCHA**: Do not prematurely add auth or user business feature modules beyond what the phase requires.
- **VALIDATE**: Each service module composes only the modules needed for skeleton bootstrapping and has a clear boundary.

### Task 4: Turn platform-config into a real shared config module
- **ACTION**: Evolve `libs/platform-config` from constants to a reusable config library.
- **IMPLEMENT**: Add env namespace helpers, validation hooks, typed config contracts, and exports that each app can use consistently.
- **MIRROR**: `NAMING_CONVENTION`, `REPOSITORY_PATTERN`, and ADR-005 rules.
- **IMPORTS**: `@nestjs/config`, chosen validation library, exported tokens/types.
- **GOTCHA**: Respect ADR rule that service code must not read `process.env` directly outside bootstrap/config layer.
- **VALIDATE**: Apps can import config module/providers without duplicating env parsing logic.

### Task 5: Turn platform-logger into a real shared logger module
- **ACTION**: Scaffold the shared logger module/provider surface.
- **IMPLEMENT**: Export logger module metadata, baseline field set, bootstrap helper contracts, and placeholders for Nest logger integration using the DI-managed pattern.
- **MIRROR**: `LOGGING_PATTERN` and existing `platformLoggerBaseline` constants.
- **IMPORTS**: Nest logger abstractions and planned pino integration packages.
- **GOTCHA**: Preserve redaction and `bufferLogsAtBootstrap` assumptions from ADR-003 and current baseline.
- **VALIDATE**: Logger module exports are sufficient for all three apps to use one consistent bootstrap pattern.

### Task 6: Turn platform-observability into a real bootstrap helper/module surface
- **ACTION**: Scaffold observability bootstrap boundaries without fully implementing tracing pipelines.
- **IMPLEMENT**: Export trace header contracts, observability options types, initialization ordering helpers, and app-level integration points.
- **MIRROR**: `NAMING_CONVENTION` and existing `platformObservabilityBaseline` shape.
- **IMPORTS**: Planned OpenTelemetry packages and optional metrics integration adapters.
- **GOTCHA**: Keep actual runtime instrumentation light in phase 2; focus on integration surface, not full telemetry implementation.
- **VALIDATE**: Apps can import one observability entrypoint and know where later tracing/metrics work will attach.

### Task 7: Add GraphQL gateway skeleton module
- **ACTION**: Create the `gateway` app’s GraphQL bootstrap layer.
- **IMPLEMENT**: Add a `graphql` module using Nest `GraphQLModule` with code-first Apollo driver configuration, async config loading, and minimal schema readiness.
- **MIRROR**: `SERVICE_PATTERN` and external GraphQL docs.
- **IMPORTS**: `@nestjs/graphql`, Apollo driver package, shared config module.
- **GOTCHA**: Use `graphiql`, not deprecated Playground; use `forRootAsync()` so env-based config can be injected cleanly.
- **VALIDATE**: Gateway module tree has a dedicated GraphQL module and no hardcoded environment reads.

### Task 8: Add health/readiness modules to all apps
- **ACTION**: Create health surface per app with shared conventions.
- **IMPLEMENT**: Add `health` modules/controllers or equivalent structure for `gateway`, `auth-service`, and `user-service`, with readiness/liveness endpoints or clearly defined placeholders following Terminus direction.
- **MIRROR**: ADR-005 health requirement and `TEST_STRUCTURE` style of explicit structural assertions.
- **IMPORTS**: `@nestjs/terminus` and any needed HTTP indicator helpers.
- **GOTCHA**: Liveness and readiness must remain distinct; do not conflate app-up with dependency-ready.
- **VALIDATE**: Each app has a health module path and root module imports it.

### Task 9: Add skeleton smoke tests for apps and modules
- **ACTION**: Extend testing from structure-only into scaffold validation.
- **IMPLEMENT**: Add tests that assert app/module files exist, project maps remain correct, scripts exist, and shared platform libs export the intended surfaces.
- **MIRROR**: `TEST_STRUCTURE` from `test/architecture-baseline-structure.test.mjs`.
- **IMPORTS**: `node:test`, `node:assert/strict`, `node:fs`, and optional JSON parsing of config files.
- **GOTCHA**: Keep tests fast and structural in phase 2; avoid requiring full Nest dependency boot if packages are not yet installed.
- **VALIDATE**: `npm test` covers both phase-1 and phase-2 scaffold expectations.

### Task 10: Update build and project config for app/lib compilation
- **ACTION**: Ensure workspace TS and Nest project config correctly includes new files and excludes the right test/spec paths.
- **IMPLEMENT**: Adjust root and per-project tsconfig files, plus any Nest compiler options/assets required by the scaffold.
- **MIRROR**: Existing `tsconfig`/`nest-cli.json` structure.
- **IMPORTS**: N/A — config task.
- **GOTCHA**: Avoid introducing path aliases or compiler features not justified by current scope; keep configuration minimal but real.
- **VALIDATE**: `npm run build` succeeds with the new scaffold.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| Root scripts coverage | `package.json` | App-specific start/build/test scripts exist alongside root scripts | No |
| Nest project map coverage | `nest-cli.json` | All apps/libs referenced by the scaffold are declared | Yes |
| Config module export coverage | `libs/platform-config` exports | Shared config contracts exist and no direct env usage leaks into app placeholders | Yes |
| Logger module export coverage | `libs/platform-logger` exports | Logger surface preserves field and redaction baseline | Yes |
| Observability module export coverage | `libs/platform-observability` exports | Trace/header contracts and baseline options remain available | Yes |
| Gateway GraphQL scaffold coverage | GraphQL module files | Gateway has dedicated GraphQL bootstrap module using async config pattern | Yes |
| Health module coverage | All apps | Each app has health/readiness module presence | Yes |

### Edge Cases Checklist
- [ ] Missing required environment variables at bootstrap
- [ ] GraphQL gateway config toggles between dev/prod safely
- [ ] App boot order preserves logger/config before feature modules
- [ ] Health endpoint exists even before DB or auth logic is implemented
- [ ] Shared config/logger libs can be imported by all apps without circular dependency
- [ ] Future auth/user modules can attach without changing app bootstrap signatures

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
EXPECT: Still reports schema not configured yet, or advances cleanly if phase 2 introduces validation plumbing without persistence

### Browser Validation (if applicable)
```bash
# Start gateway and verify after dependencies are installed
npm run start:gateway
```
EXPECT: Gateway bootstraps with GraphQL and health module wiring

### Manual Validation
- [ ] `gateway`, `auth-service`, and `user-service` each have real `main.ts` and `AppModule`
- [ ] `gateway` has a dedicated GraphQL bootstrap module
- [ ] all three apps expose a health/readiness module path
- [ ] shared config/logger/observability libs export module/provider surfaces, not just constants
- [ ] no new business logic for auth or user domain was added in this phase
- [ ] root scripts clearly support running or validating each app

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
| Dependencies needed for real Nest scaffold are not yet installed at repo root | High | High | Plan the exact package additions and keep tests structural until runtime deps are available |
| Platform Skeleton drifts into auth/user business implementation | Medium | High | Keep scope to bootstrap/modules/config/health/test scaffold only |
| Shared libs become dumping grounds for business logic | Medium | Medium | Restrict them to platform concerns and document boundaries in modules/export surfaces |
| GraphQL gateway setup introduces environment-specific hacks | Medium | Medium | Use async config-driven setup with shared config module |
| Health/readiness gets overbuilt before dependencies exist | Low | Medium | Keep health indicators minimal and scaffolded, not fully integrated to DB or downstreams yet |

## Notes
- The biggest difference between phase 1 and phase 2 is that phase 2 should create real Nest runtime structure, not more architecture prose.
- The implementation may need to add actual NestJS packages at repo root; that is within scope for phase 2 because the goal is runnable scaffold.
- Keep `node:test` structural tests unless a true Nest test toolchain is added during this phase, in which case preserve at least one fast structural smoke suite at repo root.
