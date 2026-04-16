# Plan: Identity & Tenant Foundation

## Summary
Phase `Identity & Tenant Foundation` sẽ cài đặt nền tảng authentication và tenant-aware authorization đầu tiên trên scaffold NestJS hiện có. Trọng tâm là tạo auth module/service trong `auth-service` để xử lý login và issue token, tạo hợp đồng membership/tenant projection tối thiểu trong `user-service`, và thêm JWT verification + GraphQL auth context + guard/decorator baseline ở `gateway` để mọi protected operation có tenant-aware request context rõ ràng.

## User Story
As a platform engineering team, I want tenant-aware authentication and authorization foundations across the gateway, auth-service, and user-service, so that protected requests carry a validated user and tenant context before business modules are added.

## Problem → Solution
Hiện workspace đã có app scaffold, shared config/logger/observability modules, GraphQL bootstrap, và health surfaces, nhưng chưa có bất kỳ auth flow hay tenant context thực thi nào → thêm auth core, JWT issuance/verification, membership and tenant models, GraphQL guards/decorators, và baseline RBAC contracts để mọi protected request có authz path rõ ràng.

## Metadata
- **Complexity**: XL
- **Source PRD**: `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`
- **PRD Phase**: Identity & Tenant Foundation
- **Estimated Files**: 35

---

## UX Design

### Before
N/A — internal change

### After
N/A — internal change

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Gateway GraphQL request | Không có auth context | Có JWT verification và `req.user`/tenant context | Internal API platform change |
| Auth service | Chưa có login/token issue | Có auth module/service/strategy baseline | Foundation for later business flows |
| User service | Chưa có membership projection | Có tenant membership contracts/service baseline | Needed for RBAC context |
| Protected operations | Chưa có guard/decorator path | Có `@Public()`, auth guard, và role/tenant-aware metadata path | Sets baseline for future resolvers/endpoints |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | 165-204 | Defines phase 3 goal/scope/success signal and decisions log for auth/authz |
| P0 (critical) | `docs/architecture/adr-002-auth-and-tenant-model.md` | 11-44 | Frozen auth/tenant/membership/RBAC decisions that implementation must honor |
| P0 (critical) | `docs/architecture/adr-005-error-and-config-contracts.md` | 11-45 | Error and config constraints that auth flow must follow |
| P0 (critical) | `.claude/PRPs/reports/platform-skeleton-report.md` | 18-90 | Current runtime scaffold reality and intentional gaps from phase 2 |
| P0 (critical) | `apps/gateway/src/graphql/graphql.module.ts` | 1-21 | Current GraphQL gateway bootstrap where auth context integration must attach |
| P0 (critical) | `apps/gateway/src/app.module.ts` | 1-20 | Current gateway module composition |
| P0 (critical) | `apps/auth-service/src/app.module.ts` | 1-18 | Current auth-service module composition |
| P0 (critical) | `apps/user-service/src/app.module.ts` | 1-18 | Current user-service module composition |
| P1 (important) | `libs/platform-config/src/index.ts` | 1-55 | Current config module pattern and env validation setup |
| P1 (important) | `libs/platform-config/src/app-config.ts` | 1-48 | Current app config definitions and namespace generation |
| P1 (important) | `libs/platform-logger/src/index.ts` | 1-46 | Current logger module/helper pattern that auth modules should mirror |
| P1 (important) | `test/platform-skeleton-smoke.test.mjs` | 1-35 | Current lightweight smoke-test style to extend in phase 3 |
| P2 (reference) | `.opencode/plugins/ecc-hooks.ts` | 55-91 | Lightweight structured logging helper and small function style |
| P2 (reference) | `.opencode/tools/run-tests.ts` | 33-95 | Context extraction and helper-driven orchestration style |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Nest Passport/JWT auth patterns | `/recipes/passport`, `/security/authentication` | Use `@nestjs/passport` with dedicated `LocalStrategy` and `JwtStrategy`; `AuthService` issues tokens, guards/strategies verify them |
| Guards and custom decorators | `/guards`, `/custom-decorators` | Use metadata-based decorators with guards + `Reflector`; throw `UnauthorizedException` explicitly for auth failures |
| GraphQL auth context integration | `/graphql/guards-interceptors`, `/recipes/passport` | Convert `ExecutionContext` to `GqlExecutionContext` and override `getRequest()` for GraphQL Passport guards |
| Nest module patterns | `/modules` | Feature capabilities should live in explicit modules that export only public providers |
| Testing auth guards/strategies | `/fundamentals/unit-testing`, `/guards`, `/recipes/passport` | Test modules/services with `createTestingModule()` and override guards/providers where needed |

---

## Patterns to Mirror

### NAMING_CONVENTION
// SOURCE: `libs/platform-config/src/index.ts:11-20`, `libs/platform-config/src/app-config.ts:11-27`, `libs/platform-logger/src/index.ts:3-18`
```ts
export const platformConfigTokens = {
  appConfig: "platform.config.app",
  authConfig: "platform.config.auth",
  observabilityConfig: "platform.config.observability",
} as const
```

```ts
export const platformAppConfig = {
  gateway: {
    name: "gateway",
    defaultPort: 3000,
    envPrefix: "GATEWAY",
  },
```

```ts
export const platformLoggerFields = [
  "timestamp",
  "level",
  "service",
```

Observed pattern:
- exported constants and types are domain-prefixed and explicit
- literal arrays/objects derive runtime + type contracts together
- phase 3 should use names like `authTokenClaims`, `tenantContextTokens`, `membershipRoles` instead of generic names

### ERROR_HANDLING
// SOURCE: `docs/architecture/adr-005-error-and-config-contracts.md:13-24`, `.opencode/tools/run-tests.ts:122-137`
```md
- Tất cả config bắt buộc phải được parse và validate tại startup.
- Service code không được tự đọc `process.env` trực tiếp ngoài lớp config bootstrap.
- Internal HTTP errors phải có envelope thống nhất tối thiểu gồm:
  - `code`
  - `message`
  - `status`
  - `requestId`
  - `traceId`
  - `details` tùy chọn
```

```ts
    } catch {
      // Ignore parse errors
    }
```

Observed pattern:
- bootstrap/config failures fail fast
- optional detection paths may fail softly, but auth request paths should throw explicit Nest exceptions
- phase 3 guards should throw `UnauthorizedException`/`ForbiddenException`, not silently return false unless desired default behavior is explicitly intended

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
- auth code must respect redaction of sensitive fields
- log at service/operation level, not full credentials or token dumps
- phase 3 should log auth outcomes and context minimally, never raw secrets

### REPOSITORY_PATTERN
// SOURCE: `libs/platform-config/src/app-config.ts:3-9`, `.opencode/plugins/lib/changed-files-store.ts:22-30`
```ts
export type PlatformAppConfigDefinition = {
  name: PlatformApplicationName
  defaultPort: number
  envPrefix: string
}
```

```ts
export function getChanges(): Map<string, ChangeType> {
  return new Map(changes)
}
```

Observed pattern:
- define small exported data contracts near the module that owns them
- expose narrow helper functions and immutable values
- phase 3 should keep membership/role/claim contracts in focused files/modules instead of a giant `types.ts`

### SERVICE_PATTERN
// SOURCE: `apps/gateway/src/app.module.ts:11-19`, `libs/platform-config/src/index.ts:35-53`, `.opencode/tools/run-tests.ts:33-41`
```ts
@Module({
  imports: [
    PlatformConfigModule.register(platformAppConfig.gateway),
    PlatformLoggerModule,
    PlatformObservabilityModule,
    GatewayGraphqlModule,
    GatewayHealthModule,
  ],
})
export class AppModule {}
```

```ts
export class PlatformConfigModule {
  static register(definition: PlatformAppConfigDefinition): DynamicModule {
```

```ts
  async execute(args, context) {
    const { pattern, coverage, watch, updateSnapshots } = args
    const cwd = context.worktree || context.directory
```

Observed pattern:
- modules are thin composition roots
- registration/config surfaces use explicit factory methods
- phase 3 should keep auth bootstrap, strategies, guards, and decorators in separate focused modules/files rather than large all-in-one modules

### TEST_STRUCTURE
// SOURCE: `test/platform-skeleton-smoke.test.mjs:5-35`, `test/architecture-baseline-structure.test.mjs:23-63`
```js
test("gateway has graphql and health modules wired", () => {
  const appModule = fs.readFileSync("apps/gateway/src/app.module.ts", "utf8")
  const graphqlModule = fs.readFileSync("apps/gateway/src/graphql/graphql.module.ts", "utf8")

  assert.match(appModule, /GatewayGraphqlModule/)
```

```js
test("shared platform libs expose scaffold surfaces", () => {
  const configIndex = fs.readFileSync("libs/platform-config/src/index.ts", "utf8")
  const loggerIndex = fs.readFileSync("libs/platform-logger/src/index.ts", "utf8")
```

Observed pattern:
- root validation still uses fast structural tests with `node:test`
- phase 3 should add structural coverage for auth modules, guards, strategies, and config contracts; runtime-heavy auth tests can be added gradually but keep at least one fast repo-root smoke layer

---

## Unified Discovery Table

| Category | File:Lines | Pattern | Key Snippet |
|---|---|---|---|
| Similar implementation | `apps/gateway/src/graphql/graphql.module.ts:8-18` | Async module configuration with injected config service | `GraphQLModule.forRootAsync<ApolloDriverConfig>` |
| Naming | `libs/platform-config/src/app-config.ts:11-27` | Domain-prefixed config maps and explicit app names | `platformAppConfig` |
| Error | `docs/architecture/adr-005-error-and-config-contracts.md:13-24` | Fail-fast config and explicit internal error envelope | `Service code không được tự đọc process.env` |
| Logging | `libs/platform-logger/src/index.ts:20-46` | Logger baseline + bootstrap helper | `createPlatformLogger(serviceName: string)` |
| Type definitions | `libs/platform-config/src/app-config.ts:3-9` | Focused exported type contracts next to implementation | `PlatformAppConfigDefinition` |
| Test patterns | `test/platform-skeleton-smoke.test.mjs:5-35` | `node:test` structural smoke checks | `assert.match(... /ApolloDriver/)` |
| Configuration | `libs/platform-config/src/index.ts:35-53` | Dynamic shared config module registration | `PlatformConfigModule.register(...)` |
| Dependencies | `package.json:27-44` | Nest + GraphQL runtime installed, but auth packages absent | No `@nestjs/passport`, `@nestjs/jwt`, `passport-jwt` yet |
| Entry Points | `apps/auth-service/src/main.ts`, `apps/gateway/src/main.ts` | Bootstrapped Nest apps exist and can host auth modules/guards | `NestFactory.create(AppModule, { bufferLogs: true })` |
| Contracts | `docs/architecture/adr-002-auth-and-tenant-model.md:11-44` | User/Tenant/Membership/JWT/RBAC baseline already frozen | `tenant-scoped RBAC` |

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md` | UPDATE | Mark `Identity & Tenant Foundation` as `in-progress` and attach plan path |
| `package.json` | UPDATE | Add auth-related runtime packages and any new auth test scripts |
| `libs/platform-config/src/app-config.ts` | UPDATE | Extend config schema for JWT secrets, token TTLs, and auth-specific settings |
| `libs/platform-auth/src/index.ts` | CREATE | Shared auth contracts, decorators, claims, and helper exports |
| `libs/platform-auth/src/auth-context.ts` | CREATE | Define request user/tenant/claims context shape |
| `libs/platform-auth/src/auth.decorators.ts` | CREATE | `@Public()`, `@CurrentUser()`, `@TenantContext()`, and role metadata decorators |
| `libs/platform-auth/src/auth.guard.ts` | CREATE | GraphQL-aware JWT auth guard wrapper baseline |
| `libs/platform-auth/src/roles.guard.ts` | CREATE | Tenant-scoped roles/permission baseline guard |
| `libs/platform-auth/src/constants.ts` | CREATE | Metadata keys and token claims constants |
| `libs/platform-auth/tsconfig.lib.json` | CREATE | New shared auth library project config |
| `nest-cli.json` | UPDATE | Register new `platform-auth` library |
| `apps/auth-service/src/app.module.ts` | UPDATE | Import auth module and wire auth feature boundary |
| `apps/auth-service/src/auth/auth.module.ts` | CREATE | Root auth feature module |
| `apps/auth-service/src/auth/auth.service.ts` | CREATE | Login validation and token issuance baseline |
| `apps/auth-service/src/auth/auth.controller.ts` | CREATE | Minimal login/refresh/me endpoints or placeholders per chosen shape |
| `apps/auth-service/src/auth/dto/login.dto.ts` | CREATE | Login input contract |
| `apps/auth-service/src/auth/dto/token-response.dto.ts` | CREATE | Access/refresh token response contract |
| `apps/auth-service/src/auth/strategies/local.strategy.ts` | CREATE | Local credential validation strategy baseline |
| `apps/auth-service/src/auth/strategies/jwt.strategy.ts` | CREATE | JWT validation strategy baseline for auth-service side checks |
| `apps/auth-service/src/auth/guards/local-auth.guard.ts` | CREATE | Local auth guard for login route |
| `apps/auth-service/src/auth/auth.types.ts` | CREATE | Claims, session, membership role types for auth-service boundary |
| `apps/user-service/src/app.module.ts` | UPDATE | Import membership/tenant module boundary |
| `apps/user-service/src/membership/membership.module.ts` | CREATE | Membership and tenant projection feature module |
| `apps/user-service/src/membership/membership.service.ts` | CREATE | Minimal membership lookup and tenant role projection |
| `apps/user-service/src/membership/membership.controller.ts` | CREATE | Internal HTTP endpoint(s) for current membership/tenant projection |
| `apps/user-service/src/membership/membership.types.ts` | CREATE | Membership and tenant response contracts |
| `apps/gateway/src/app.module.ts` | UPDATE | Import shared auth module/guarding support if needed |
| `apps/gateway/src/graphql/graphql.module.ts` | UPDATE | Attach context factory and GraphQL request typing needed for auth |
| `apps/gateway/src/auth/gateway-auth.module.ts` | CREATE | Gateway auth integration module |
| `apps/gateway/src/auth/strategies/jwt.strategy.ts` | CREATE | Gateway-side JWT verify strategy |
| `apps/gateway/src/auth/guards/gql-jwt-auth.guard.ts` | CREATE | GraphQL Passport guard overriding `getRequest()` |
| `apps/gateway/src/auth/auth.resolver.ts` | CREATE | Minimal `me`/context resolver to prove GraphQL auth context wiring |
| `apps/gateway/src/auth/auth.types.ts` | CREATE | Gateway-facing auth context/DTO contracts |
| `test/platform-skeleton-smoke.test.mjs` | UPDATE | Extend smoke checks for auth module/library presence |
| `test/identity-tenant-foundation-smoke.test.mjs` | CREATE | Structural checks for guards, decorators, auth-service/user-service boundaries |

## NOT Building

- Production-grade password reset, email verification, MFA, or SSO/OIDC integration
- Persistent session store or refresh token revocation lists beyond baseline contract decisions
- Database-backed user storage, membership persistence, or migrations
- Fine-grained permission engine beyond initial tenant-scoped RBAC/role contract
- Full audit/security event implementation from phase 4
- Gateway rate limiting, query complexity checks, or cache strategy from phase 5

---

## Step-by-Step Tasks

### Task 1: Add auth runtime dependencies and config surface
- **ACTION**: Extend root dependencies and config schema for JWT/passport-based auth.
- **IMPLEMENT**: Add `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-local`, `passport-jwt`, and any typing package needed; extend `platform-config` with JWT secret, access token TTL, refresh token TTL, and auth-service-specific config keys.
- **MIRROR**: `NAMING_CONVENTION` and existing `platform-config` module pattern.
- **IMPORTS**: Root `package.json`, `libs/platform-config/src/app-config.ts`, `libs/platform-config/src/index.ts`.
- **GOTCHA**: Keep env validation centralized; do not let strategies/services read raw `process.env` directly.
- **VALIDATE**: `npm run build` passes and config schema clearly exposes auth settings.

### Task 2: Create shared platform-auth library for contracts and decorators
- **ACTION**: Introduce a reusable shared auth library to avoid duplicating context/decorator logic between gateway and services.
- **IMPLEMENT**: Add metadata constants, auth claim types, tenant context types, and decorators such as `@Public()`, `@Roles()`, `@CurrentUser()`, and `@TenantContext()`.
- **MIRROR**: `NAMING_CONVENTION`, `REPOSITORY_PATTERN`, and current `libs/platform-*` structure.
- **IMPORTS**: Nest metadata helpers, type contracts, config-independent constants.
- **GOTCHA**: Keep library free of app-specific business logic; it should expose contracts and framework helpers only.
- **VALIDATE**: New `platform-auth` lib is registered in `nest-cli.json` and exports the intended surface.

### Task 3: Implement auth module boundary inside auth-service
- **ACTION**: Create a focused `auth` feature module inside `auth-service`.
- **IMPLEMENT**: Add `AuthModule`, `AuthService`, DTOs, guards, and strategies for local login + JWT issuance baseline. Structure should keep controller thin and service/strategies separated.
- **MIRROR**: `SERVICE_PATTERN` and official Nest module/auth docs.
- **IMPORTS**: `PassportModule`, `JwtModule`, `ConfigModule`, shared platform-auth contracts.
- **GOTCHA**: Do not introduce request-scoped Passport strategies; keep strategies singleton-friendly and inject only stable dependencies.
- **VALIDATE**: `auth-service` compiles with a coherent auth module tree and no circular imports.

### Task 4: Define and implement minimal login/token issuance flow
- **ACTION**: Add a minimal auth API surface that proves credential validation and token creation wiring.
- **IMPLEMENT**: Create login DTO, token response DTO, and a login endpoint/controller flow using `LocalAuthGuard`; implement `AuthService` methods for validate user, build token claims, and sign access/refresh tokens with tenant-scoped role data placeholders.
- **MIRROR**: `ERROR_HANDLING` and `LOGGING_PATTERN` to avoid leaking credentials or tokens.
- **IMPORTS**: `JwtService`, Nest exceptions, auth DTO/types.
- **GOTCHA**: This phase should not fake persistence beyond clear placeholder/in-memory baseline. If using static fixture users for the foundation, mark them as scaffolding, not final design.
- **VALIDATE**: Build passes and smoke tests assert that auth endpoints/module files and token contracts exist.

### Task 5: Implement membership and tenant projection boundary in user-service
- **ACTION**: Add the minimal user-service capability needed for tenant-aware authz context.
- **IMPLEMENT**: Create `membership` module/service/controller and define contracts for user membership, tenant assignment, roles, and permissions projection. Provide at least one internal endpoint or provider surface for current membership lookup.
- **MIRROR**: `REPOSITORY_PATTERN` and `SERVICE_PATTERN` with narrow module contracts.
- **IMPORTS**: Shared platform-auth contracts, Nest module/controller/service primitives.
- **GOTCHA**: Keep scope to projection/lookup baseline; do not turn this into full user profile management or persistence-heavy feature work.
- **VALIDATE**: `user-service` compiles with a dedicated membership boundary and clear tenant role/permission contract.

### Task 6: Add gateway JWT verification and GraphQL auth context integration
- **ACTION**: Wire authenticated GraphQL requests through a gateway auth module.
- **IMPLEMENT**: Create gateway auth module, JWT strategy, GraphQL-aware `JwtAuthGuard`, and update GraphQL config to provide request context so guards/decorators can read `req.user` safely.
- **MIRROR**: Existing `GraphQLModule.forRootAsync()` pattern plus official GraphQL guard guidance.
- **IMPORTS**: `@nestjs/passport`, `GqlExecutionContext`, `PassportModule`, `ConfigModule`, shared auth decorators/claims.
- **GOTCHA**: GraphQL Passport guards must override `getRequest()` to read `ctx.getContext().req`; otherwise JWT auth will not work consistently.
- **VALIDATE**: Gateway compiles with dedicated auth module and GraphQL module exposes auth-aware context wiring.

### Task 7: Add public/protected metadata and baseline RBAC guard path
- **ACTION**: Establish the authorization metadata path used by future GraphQL operations.
- **IMPLEMENT**: Add `@Public()` and role-based metadata decorators, `RolesGuard`, and baseline claim-checking logic for tenant-scoped roles. Keep implementation minimal but explicit enough that protected operations have a clear guard path.
- **MIRROR**: Official `guards + Reflector` guidance and current thin-module style.
- **IMPORTS**: `Reflector`, Nest exceptions, shared metadata constants.
- **GOTCHA**: Returning `false` from a guard defaults to `403`; throw `UnauthorizedException` for authentication failures and `ForbiddenException` for authorization denials to preserve semantics.
- **VALIDATE**: At least one resolver/route can be marked public and another protected in a structurally testable way.

### Task 8: Add minimal authenticated GraphQL resolver to prove context wiring
- **ACTION**: Prove the GraphQL gateway auth context is usable from resolver land.
- **IMPLEMENT**: Add a minimal resolver, such as `me` or `authContext`, that reads the current authenticated user/tenant context via custom decorators and returns a typed shape.
- **MIRROR**: `SERVICE_PATTERN` and GraphQL module integration style.
- **IMPORTS**: `@nestjs/graphql`, shared auth decorators, gateway auth types.
- **GOTCHA**: Keep resolver scope intentionally tiny; this is a context proof, not a full identity API surface.
- **VALIDATE**: Structural smoke tests confirm the resolver exists and references current user/auth context flow.

### Task 9: Extend test coverage for auth and tenant skeleton
- **ACTION**: Add fast structural tests for phase 3 artifacts and update prior smoke tests.
- **IMPLEMENT**: Extend `platform-skeleton-smoke` for auth module/library presence and add `identity-tenant-foundation-smoke` covering strategies, guards, decorators, membership contracts, and GraphQL auth resolver wiring.
- **MIRROR**: Existing `node:test` style in root tests.
- **IMPORTS**: `node:test`, `node:assert/strict`, `node:fs`.
- **GOTCHA**: Keep tests structural and deterministic; avoid deep runtime auth boot if it would force unrelated infrastructure too early.
- **VALIDATE**: `npm test` and any new phase-specific smoke test script pass cleanly.

### Task 10: Tighten module boundaries and exports for future phases
- **ACTION**: Ensure auth/tenant foundations expose only what phase 4 and 5 need.
- **IMPLEMENT**: Review imports/exports across `auth-service`, `user-service`, `gateway`, and `platform-auth`; keep public APIs explicit and avoid accidental cross-module leakage.
- **MIRROR**: `AppModule` composition style and Nest module encapsulation guidance.
- **IMPORTS**: Module metadata and shared platform contracts.
- **GOTCHA**: Do not mark auth modules global by default unless there is a clear necessity; prefer explicit imports/exports.
- **VALIDATE**: Build passes with no unresolved provider imports and module boundaries remain easy to reason about.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| Auth dependency coverage | `package.json` | Auth runtime packages are present | No |
| Config coverage for auth | `platform-config` files | JWT/auth env settings validated centrally | Yes |
| Shared auth library coverage | `platform-auth` exports | Decorators, metadata constants, and context contracts exist | Yes |
| Auth-service module coverage | Auth module files | Login/auth flow files and strategies/guards are present | Yes |
| User-service membership coverage | Membership module files | Membership projection contracts and service/controller boundary exist | Yes |
| Gateway auth integration coverage | Gateway auth files | JWT strategy, GraphQL guard, and auth resolver are wired | Yes |
| Public/protected metadata coverage | Guard/decorator files | Public and role metadata path exists | Yes |

### Edge Cases Checklist
- [ ] Missing JWT secret or TTL config at startup
- [ ] Invalid or expired bearer token
- [ ] GraphQL request without `Authorization` header on protected resolver
- [ ] Public login route must bypass auth guard
- [ ] User belongs to multiple tenants and claims must still be tenant-scoped
- [ ] Role metadata absent on a protected route/resolver
- [ ] Refresh token contract exists without full persistence backing yet
- [ ] Auth logger never emits raw password or token values

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
EXPECT: Still placeholder unless phase 3 explicitly introduces validation for auth persistence contracts only

### Browser Validation (if applicable)
```bash
# Start gateway and verify
npm run start:gateway
```
EXPECT: Gateway boots with GraphQL auth module wiring and health endpoint still available

### Manual Validation
- [ ] `auth-service` contains auth module, service, DTOs, guards, and strategies
- [ ] `user-service` contains membership module/service/controller and role/tenant projection contracts
- [ ] `gateway` contains JWT strategy, GraphQL auth guard, and a minimal authenticated resolver
- [ ] shared `platform-auth` library exports decorators, metadata constants, and auth context types
- [ ] GraphQL module has request context wiring suitable for Passport guard usage
- [ ] no password/token secret is logged or hardcoded outside config validation defaults

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
| Auth phase sprawls into full identity product work | High | High | Keep to login, token/session baseline, membership projection, and gateway verification only |
| In-memory/placeholder identity data leaks into assumed production design | Medium | High | Label scaffolding clearly and keep contracts explicit so persistence can replace it later |
| GraphQL auth guard is wired incorrectly because request context isn’t mapped | Medium | High | Use dedicated GQL guard overriding `getRequest()` and test structural presence |
| Shared auth contracts become coupled to one app | Medium | Medium | Keep `platform-auth` focused on decorators/claims/context, not service logic |
| JWT claims become too rich too early | Medium | Medium | Keep claims minimal: subject, tenant/membership reference, roles/permissions baseline |

## Notes
- Phase 3 should produce real auth and tenant-aware request context, but still avoid persistence-heavy commitments that belong to later phases.
- The clean split for this repo is: `auth-service` issues tokens, `gateway` verifies tokens and injects context, `user-service` projects membership/tenant data.
- Because phase 4 can run in parallel afterward, phase 3 should leave clean attachment points for audit and correlation metadata without trying to implement them fully here.
