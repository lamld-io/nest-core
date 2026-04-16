## Summary

Add the tenant-aware authentication foundation for the NestJS microservice workspace so the gateway, auth service, and user service can share a consistent JWT, tenant context, and membership authorization baseline.

## Changes

- Add auth-service auth module, controller, repository, DTOs, guards, and JWT/local strategies
- Add gateway auth integration with JWT verification, GraphQL auth context wiring, and `me` resolver
- Add user-service membership projection module, controller, service, and JWT protection
- Add shared `platform-auth` library for claims, decorators, guards, role metadata, and tenant context contracts
- Extend platform config for auth settings and secure GraphQL IDE defaults
- Add integration and smoke tests covering login validation, refresh-token rejection, and membership authorization
- Update PRP artifacts for architecture baseline, platform skeleton, and identity/tenant foundation phases

## Files Changed

- Source: `apps/auth-service/src/auth/*`, `apps/gateway/src/auth/*`, `apps/user-service/src/membership/*`, `libs/platform-auth/*`
- Config: `package.json`, `package-lock.json`, `nest-cli.json`, `libs/platform-config/src/app-config.ts`
- Tests: `test/auth-integration.test.mjs`, `test/identity-tenant-foundation-smoke.test.mjs`, `test/platform-skeleton-smoke.test.mjs`
- PRP artifacts: `.claude/PRPs/reports/*.md`, `.claude/PRPs/plans/completed/*.md`, `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`

## Testing

- `npm run build`
- `npm test`
- `npm run lint`
- `npm run test:identity-tenant`

## Related Issues

None

## PRP Artifacts

- PRD: `.claude/PRPs/prds/multi-tenant-accounting-platform-foundation.prd.md`
- Reports:
  - `.claude/PRPs/reports/architecture-baseline-report.md`
  - `.claude/PRPs/reports/platform-skeleton-report.md`
  - `.claude/PRPs/reports/identity-tenant-foundation-report.md`
- Completed plans:
  - `.claude/PRPs/plans/completed/architecture-baseline.plan.md`
  - `.claude/PRPs/plans/completed/platform-skeleton.plan.md`
  - `.claude/PRPs/plans/completed/identity-tenant-foundation.plan.md`

## Notes

- This PR is relatively large at 46 changed files because it includes the end-to-end auth foundation plus the supporting PRP artifacts.
- Persistence is still scaffold-level; auth and membership remain foundation-oriented rather than production-complete identity flows.
