# Multi-Tenant Accounting Platform Foundation

## Problem Statement

Các doanh nghiệp nhỏ và vừa, đơn vị dịch vụ kế toán, và đội ngũ vận hành tài chính nội bộ thường cần một nền tảng kế toán cloud có thể phục vụ nhiều tenant, nhiều người dùng, và nhiều vai trò khác nhau mà vẫn giữ được tenant isolation, auditability, và khả năng mở rộng. Nếu không giải quyết đúng từ lớp nền tảng, hệ thống rất dễ gặp lỗi phân quyền, lẫn dữ liệu giữa tenant, khó quan sát sự cố, và tốn kém khi mở rộng thêm các domain kế toán như sổ cái, hóa đơn, chi phí, và báo cáo.

## Evidence

- Zoho Books nhấn mạnh collaboration, roles and permissions, audit trail, automation, multi-currency, và cloud access như các năng lực cốt lõi của phần mềm kế toán hiện đại: `https://www.zoho.com/books/`
- QuickBooks định vị giá trị ở cloud accounting, multiple users, customizable permissions, reporting, payment workflows, và security controls: `https://quickbooks.intuit.com/accounting/`
- Xero nhấn mạnh small business cloud accounting, accountant collaboration, app integrations, data & authentication, và các workflow tài chính số hóa: `https://xero.com/`
- Assumption - needs validation through stakeholder interviews: người dùng mục tiêu cần multi-tenant accounting platform vì giải pháp hiện tại khó scale về tenant isolation, phân quyền, audit, và khả năng mở rộng domain.
- Assumption - needs validation through technical discovery with product stakeholders: phase đầu chỉ cần `gateway`, `auth`, `user`, và platform capabilities, chưa cần xây các accounting domain services đầy đủ.

## Proposed Solution

Xây nền tảng backend cho phần mềm kế toán theo kiến trúc `NestJS microservices + central GraphQL Gateway`, với phạm vi phase đầu chỉ gồm `GraphQL Gateway`, `Auth Service`, `User Service`, và các năng lực nền tảng bắt buộc cho multi-tenancy, authorization, audit, logging, tracing, metrics, và operational readiness. Chọn hướng này thay vì modular monolith vì quyết định sản phẩm đã ưu tiên scale, maintainability, và observability ngay từ đầu; đồng thời vẫn giữ triển khai thực dụng bằng cách giới hạn số service ban đầu ở mức tối thiểu.

## Key Hypothesis

We believe a multi-tenant platform foundation with a central GraphQL gateway, dedicated auth and user services, and production-grade observability will reduce architectural rework and de-risk future accounting domain expansion for internal product and engineering teams.
We'll know we're right when new tenant-aware accounting services can be added without redesigning identity boundaries, and when authentication, authorization, tracing, and audit requirements are already satisfied in the first production-ready release.

## What We're NOT Building

- Full accounting domain services in v1 foundation - vì mục tiêu hiện tại là chốt nền tảng, không phải hoàn thiện ledger, invoicing, AP/AR, tax, hay reporting.
- Apollo Federation or GraphQL subgraphs in phase đầu - vì số service ban đầu còn ít, chi phí governance và vận hành lớn hơn giá trị nhận được.
- Database-per-tenant or schema-per-tenant isolation - vì chưa có evidence về yêu cầu compliance hoặc enterprise isolation đủ mạnh để biện minh cho độ phức tạp cao hơn.
- Full CQRS/read-model architecture from day one - vì chưa cần tối ưu read-heavy aggregate queries trước khi có accounting workloads thực tế.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Tenant context propagation coverage | 100% of authenticated requests carry validated `tenantId`, `userId`, and `traceId` | Integration tests and request tracing inspection |
| Authz enforcement coverage for foundation APIs | 100% of protected gateway operations and downstream service endpoints covered by automated auth/authz tests | Automated test suite and security review checklist |
| Observability baseline completeness | Logs, traces, and metrics available for gateway, auth, and user services before first production cut | Grafana/Loki/Tempo/Prometheus dashboard and smoke verification |
| Foundation extensibility readiness | First new accounting domain service can integrate without changing core auth model | Architecture review against ADRs and spike validation |

## Open Questions

- [ ] Tenant đại diện cho doanh nghiệp sử dụng phần mềm kế toán hay một đơn vị dịch vụ kế toán quản lý nhiều khách hàng?
- [ ] Một user có thể đồng thời thuộc nhiều tenant, nhiều legal entity, hoặc nhiều chi nhánh trong cùng tenant không?
- [ ] Mức độ audit/compliance yêu cầu đến đâu: audit trail thông thường, immutable audit log, hay accounting-grade posting history?
- [ ] Có cần SSO/OIDC provider bên ngoài ngay từ đầu hay username/password nội bộ là đủ cho phase đầu?
- [ ] Có yêu cầu realtime GraphQL subscriptions cho identity/admin flows không?
- [ ] KPI business cụ thể cho phase đầu là gì ngoài readiness về kiến trúc và vận hành?

---

## Users & Context

**Primary User**
- **Who**: Product và engineering team đang xây nền tảng cho phần mềm kế toán multi-tenant; gián tiếp phục vụ admin tenant, kế toán viên nội bộ, và kế toán trưởng của doanh nghiệp SME.
- **Current behavior**: Chưa có nền tảng chuẩn; các hệ thống tương tự ngoài thị trường thường ghép auth, user, permission, audit, và tenant context vào một lớp ứng dụng khó tách về sau.
- **Trigger**: Bắt đầu project mới và cần chốt nền tảng backend trước khi triển khai các module kế toán thực tế.
- **Success state**: Có một foundation rõ ràng, tenant-aware, observable, và có thể mở rộng để thêm các accounting services mà không phải thiết kế lại auth và cross-cutting concerns.

**Job to Be Done**
When we start building a multi-tenant accounting platform, I want a backend foundation with clear identity, tenant, authorization, and observability boundaries, so I can add accounting capabilities later without re-architecting core platform concerns.

**Non-Users**
PRD này không dành cho người dùng cuối đang thao tác hóa đơn hay hạch toán hàng ngày, vì phạm vi hiện tại chưa bao gồm workflow accounting nghiệp vụ. Nó cũng không dành cho enterprise buyers có yêu cầu compliance đặc thù chưa được xác nhận, như data residency cực đoan hoặc per-tenant dedicated infrastructure.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Central GraphQL Gateway | Entry point duy nhất cho client, chịu trách nhiệm orchestration, auth context, schema boundary, và API consistency |
| Must | Auth Service with tenant-aware identity | Cần tách identity, token, session, membership, và role context ngay từ đầu để tránh redesign sau này |
| Must | User Service with tenant membership projection | Cần quản lý profile, settings, membership, và thông tin người dùng theo tenant tách khỏi auth core |
| Must | Multi-tenant RBAC foundation | Phần mềm kế toán cần tenant isolation và role-based access chuẩn từ đầu |
| Must | Structured logging, tracing, and metrics | Observability là ưu tiên đã xác nhận và phải có từ phase đầu |
| Must | Audit/security event foundation | Accounting platform cần khả năng lần vết các sự kiện auth và thay đổi quyền |
| Should | Internal async event channel for audit and lifecycle events | Giảm coupling cho auth/user flows và chuẩn bị cho domain expansion sau |
| Should | Rate limiting, GraphQL complexity limits, and persisted query strategy | Bảo vệ gateway và giảm operational risk |
| Could | External OIDC integration | Hữu ích cho enterprise adoption nhưng chưa cần chắc chắn ở phase đầu |
| Won't | Ledger, invoice, expense, tax, and reporting services | Chủ đích defer sang phases sau để giữ scope nền tảng gọn và kiểm chứng đúng giả thuyết |

### MVP Scope

MVP của nền tảng là một backend foundation production-oriented gồm `GraphQL Gateway`, `Auth Service`, `User Service`, `PostgreSQL per service`, `Redis`, tenant-aware RBAC, audit/security events, và full observability baseline với structured logs, distributed traces, metrics, health checks, và standardized error contracts. MVP không bao gồm accounting transactions thực tế.

### User Flow

Critical path ở phase đầu:

1. Tenant admin hoặc operator đăng nhập qua `Auth Service`.
2. `GraphQL Gateway` xác thực token và xây request context gồm `userId`, `tenantId`, `roles`, `permissions`, `requestId`, `traceId`.
3. Gateway gọi `User Service` để lấy profile và membership context cần thiết.
4. Tất cả protected operations đi qua authz checks coarse ở gateway và business/data checks ở service.
5. Mọi sự kiện bảo mật và thay đổi membership quan trọng được ghi log, trace, metrics, và audit events.

---

## Technical Approach

**Feasibility**: HIGH

Lý do: kiến trúc và stack đã được chứng minh rộng rãi cho SaaS backend; phạm vi phase đầu nhỏ; các năng lực khó nhất như tenant isolation, auth/authz, và observability được đưa vào từ đầu thay vì retrofit. Tuy nhiên, có rủi ro sản phẩm chưa được xác thực đầy đủ vì hiện chưa có input trực tiếp từ stakeholder và chưa có codebase sản phẩm hiện hữu để tận dụng.

**Architecture Notes**
- Chọn `NestJS + TypeScript` cho tất cả backend services để thống nhất runtime, DI model, testing approach, và module conventions.
- Chọn `central GraphQL Gateway` thay vì federation ở phase đầu để giảm complexity khi số service còn ít.
- Gateway là entry point duy nhất cho client và chỉ giữ orchestration, auth context, batching, error mapping, observability, và API governance; không chứa accounting business logic nặng.
- Chọn `Auth Service` riêng để quản lý login, token issuance, refresh, revoke, session metadata, tenant membership lookup, và role context.
- Chọn `User Service` riêng để quản lý profile, preferences, tenant membership projection, và user administration flows.
- Chọn `HTTP nội bộ` cho synchronous service-to-service communication ở phase đầu vì đơn giản hơn gRPC trong local dev, debug, và instrumentation; có thể nâng cấp sau nếu cần.
- Chọn `NATS JetStream` cho async eventing baseline vì nhẹ hơn Kafka và phù hợp team đang ở giai đoạn foundation; sử dụng chủ yếu cho audit, security, và lifecycle events.
- Chọn `PostgreSQL` làm primary transactional store cho mỗi service; mỗi service sở hữu database riêng.
- Chọn `Redis` cho rate limiting, short-lived auth/session state, và cache membership/profile lookups.
- Chọn mô hình multi-tenant `shared database, shared schema, tenant_id per record` cho các domain services tương lai vì đây là trade-off tốt nhất cho phase đầu.
- Chọn `JWT access token + refresh token` cho authentication foundation; external OIDC support để TBD cho phase sau.
- Chọn `RBAC theo tenant` cho authorization foundation, với đường mở rộng sang permission set hoặc policy-based auth khi domain accounting sâu hơn.
- Chọn observability stack gồm `Pino` for structured logs, `OpenTelemetry` for traces, `Prometheus + Grafana` for metrics, `Loki` for log aggregation, và `Tempo` for tracing.

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tenant boundary bị thiết kế sai ngay từ đầu | M | Chốt tenant, membership, role, và data ownership bằng ADR trước khi triển khai accounting services |
| Gateway trở thành god service | M | Giữ business logic ở downstream services, giới hạn gateway vào orchestration và platform concerns |
| Authz chỉ được enforce ở gateway | M | Bắt buộc service-level business authz và tenant-filtering ở data access layer |
| Observability bị làm nửa vời | M | Xem logs, traces, metrics, dashboards, correlation IDs là deliverable phase 1 chứ không phải enhancement |
| Chọn microservices quá sớm so với độ chín domain | M | Giới hạn số service ban đầu ở 2 domain services nền tảng và defer accounting services đến khi problem shape rõ hơn |
| Async channel bị lạm dụng | L | Chỉ dùng event bus cho audit, security, và lifecycle events; giữ login/token validation là sync |
| Repo hiện tại không có codebase sản phẩm để tận dụng | H | Treat as greenfield; document assumptions explicitly; tạo ADR và implementation plan từ PRD trước khi code |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Architecture Baseline | Chốt tenant model, auth model, observability model, và ADRs nền tảng | complete | - | - | `.claude/PRPs/reports/architecture-baseline-report.md` |
| 2 | Platform Skeleton | Dựng gateway, auth service, user service, infra contracts, config, health, và service boundaries | complete | - | 1 | `.claude/PRPs/reports/platform-skeleton-report.md` |
| 3 | Identity & Tenant Foundation | Triển khai tenant-aware authentication, membership, RBAC, và token/session model | complete | with 4 | 2 | `.claude/PRPs/reports/identity-tenant-foundation-report.md` |
| 4 | Observability & Audit Foundation | Triển khai logging, tracing, metrics, dashboards, audit/security events, và guardrails | complete | with 3 | 2 | `.claude/PRPs/reports/observability-audit-foundation-report.md` |
| 5 | Gateway Hardening | Thêm rate limiting, query complexity limits, persisted query strategy, cache strategy, và operational readiness checks | pending | - | 3, 4 | - |
| 6 | Accounting Domain Readiness | Chốt domain boundaries cho ledger/invoice/expense/reporting và xác nhận service expansion path | pending | - | 5 | - |

### Phase Details

**Phase 1: Architecture Baseline**
- **Goal**: Đóng băng các quyết định nền tảng để tránh thiết kế lại ở giữa đường.
- **Scope**: ADR cho tenant model, authn/authz, internal transport, database ownership, eventing baseline, observability stack, error contracts.
- **Success signal**: Không còn ambiguity lớn về boundary giữa gateway, auth, user, và platform concerns.

**Phase 2: Platform Skeleton**
- **Goal**: Tạo khung dịch vụ và hạ tầng kỹ thuật tối thiểu để các phase tiếp theo bám vào.
- **Scope**: Monorepo/app structure, service scaffolding, config strategy, shared contracts, secret management conventions, health/readiness approach.
- **Success signal**: Gateway, auth, và user services có boundary rõ và deployability độc lập ở mức cơ bản.

**Phase 3: Identity & Tenant Foundation**
- **Goal**: Cài đặt identity và tenant boundary đúng ngay từ đầu.
- **Scope**: Login, access/refresh tokens, membership, tenant context propagation, tenant-scoped RBAC, role and permission model baseline.
- **Success signal**: Mọi protected request đều có tenant-aware context và authz path rõ ràng.

**Phase 4: Observability & Audit Foundation**
- **Goal**: Làm cho hệ thống quan sát được và audit được trước khi có domain nghiệp vụ phức tạp.
- **Scope**: Structured logging, distributed tracing, metrics, dashboards, security/audit event taxonomy, correlation standards.
- **Success signal**: Có thể trace end-to-end request qua gateway, auth, user; audit được các sự kiện identity quan trọng.

**Phase 5: Gateway Hardening**
- **Goal**: Bảo vệ gateway trước các rủi ro vận hành phổ biến.
- **Scope**: Rate limit, query depth/complexity controls, timeout/circuit breaker policy, cache strategy, persisted query decision.
- **Success signal**: Gateway có baseline security and reliability controls phù hợp cho production pilot.

**Phase 6: Accounting Domain Readiness**
- **Goal**: Chuẩn bị đường mở rộng sang domain accounting mà không sửa nền móng.
- **Scope**: Bounded contexts cho ledger, invoice, expense, tax, reporting; event taxonomy định hướng; integration contracts mức cao.
- **Success signal**: Có thể chọn domain accounting đầu tiên để triển khai mà không phải thay auth/tenant/observability architecture.

### Parallelism Notes

Phase 3 và Phase 4 có thể chạy song song sau khi platform skeleton tồn tại, vì identity/tenant foundation và observability/audit foundation là hai trục khác nhau nhưng bổ trợ nhau. Tuy nhiên, các chuẩn correlation IDs, event metadata, và error contracts phải được chia sẻ từ Phase 1 để hai phase không lệch chuẩn. Phase 5 phụ thuộc cả hai vì hardening gateway cần biết auth context và observability signals đã có mặt.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Overall architecture | Option A: microservices + central GraphQL gateway | Option B modular monolith, Option C full event-driven CQRS | Phù hợp mục tiêu scale, maintainability, observability, nhưng vẫn giới hạn số service đầu tiên để tránh over-engineering |
| Gateway design | Central GraphQL gateway, no federation in phase 1 | Apollo Federation from day one | Federation chưa đáng chi phí khi mới có auth và user services |
| Sync transport | Internal HTTP | gRPC | HTTP đơn giản hơn cho giai đoạn đầu, đủ tốt với số service ít |
| Async transport | NATS JetStream | Kafka, no broker | NATS nhẹ hơn Kafka, vẫn đủ tốt cho audit/security/lifecycle events |
| Datastore | PostgreSQL per service | Shared DB, MongoDB | Quan hệ dữ liệu và transactional integrity phù hợp với accounting platform foundation |
| Cache/ephemeral state | Redis | In-memory cache only | Hỗ trợ stateless scaling, rate limit, và auth/session metadata |
| Multi-tenant isolation model | Shared DB/shared schema with `tenant_id` | Schema-per-tenant, DB-per-tenant | Chi phí vận hành thấp hơn, phù hợp phase đầu khi chưa có compliance driver mạnh |
| Authentication model | JWT access token + refresh token | Session-only auth, external OIDC mandatory | Đơn giản, phổ biến, dễ scale; vẫn có đường nâng cấp OIDC về sau |
| Authorization model | Tenant-scoped RBAC with future policy extension | Global RBAC only, ABAC from day one | Đủ mạnh cho phase đầu và phù hợp với accounting permission model ban đầu |
| Observability stack | Pino + OpenTelemetry + Prometheus/Grafana + Loki + Tempo | Logs only, vendor-specific stack TBD | Đáp ứng ưu tiên observability ngay từ phase đầu và giữ vendor-neutral |

---

## Research Summary

**Market Context**
Các sản phẩm accounting SaaS lớn đều hội tụ về cùng một tập năng lực cốt lõi: cloud access, nhiều người dùng và vai trò, audit/security, automation, integrations, và báo cáo tài chính. Điều này củng cố rằng `identity + tenant + permissions + audit + observability` không phải tiện ích phụ, mà là foundation của sản phẩm. Một anti-pattern phổ biến cần tránh là dồn business logic và authorization logic vào một application layer duy nhất rồi phải bóc tách rất đau khi scale.

**Technical Context**
Workspace hiện tại không chứa một codebase NestJS sản phẩm để tận dụng. Repo chủ yếu là tooling/plugin cho OpenCode/ECC, không có `nest-cli.json`, không có ứng dụng NestJS hiện hữu, và README gốc gần như trống. Vì vậy technical feasibility được đánh giá như một greenfield system, không dựa vào existing implementation patterns trong repo. Điều này làm tăng tầm quan trọng của ADRs, implementation planning, và explicit assumptions trước khi bắt đầu code.

---

*Generated: 2026-04-15*
*Status: DRAFT - needs validation*
