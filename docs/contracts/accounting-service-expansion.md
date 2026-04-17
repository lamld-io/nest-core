# Accounting Service Expansion Contract

## Purpose

Tài liệu này chốt baseline contract khi thêm accounting services mới vào nền tảng hiện tại. Mục tiêu là đảm bảo mọi service mới kế thừa đúng auth, tenant, observability, error, và transport conventions đã được chốt ở phases 1-5.

## Transport Baseline

- Client-facing access tiếp tục đi qua `GraphQL Gateway`.
- Gateway-to-service synchronous calls dùng `internal HTTP` trong phase đầu.
- Asynchronous integration giữa accounting domains dùng `NATS JetStream` cho lifecycle, posting, audit, và derived-state events khi phù hợp.
- Không dùng client-direct calls vào accounting services trong phase foundation mở rộng.

## Required Request Context

Mọi accounting service request phải nhận hoặc được suy ra từ trusted context các trường sau khi có liên quan:

- `requestId`
- `traceId`
- `tenantId`
- `userId`
- `membershipId`
- `roles`
- `permissions`

Rules:
- Service must inherit existing auth context from trusted callers.
- Service must not trust tenant input from client nếu chưa qua lớp auth context đã xác thực.
- Service must preserve correlation fields trong logs, metrics labels, audit/security events, và downstream calls.

## Internal HTTP Envelope

Internal HTTP responses giữa gateway và accounting services phải giữ tối thiểu envelope sau:

```json
{
  "code": "ACCOUNTING_ERROR_CODE",
  "message": "Human-readable message",
  "status": 400,
  "requestId": "req-123",
  "traceId": "trace-123",
  "details": {
    "field": "optional"
  }
}
```

Constraints:
- `message` phải public-safe khi có khả năng bị gateway map ra external clients.
- `details` là optional nhưng không được chứa secret, raw token, hay sensitive payload không cần thiết.
- Error mapping ở gateway phải giữ public-safe errors, không lộ stack traces.

## Event Contract Baseline

Event payload cho accounting domains phải có:

- explicit `version`
- domain event name theo ngôn ngữ nghiệp vụ
- `requestId`
- `traceId`
- `tenantId`
- actor metadata như `userId` hoặc `membershipId` khi có liên quan
- timestamp và domain entity identifiers phù hợp

Example event shape:

```json
{
  "type": "ledger.entry_posted",
  "version": 1,
  "requestId": "req-123",
  "traceId": "trace-123",
  "tenantId": "tenant-1",
  "userId": "user-1",
  "entityId": "entry-1",
  "occurredAt": "2026-04-17T12:00:00.000Z",
  "payload": {}
}
```

## Domain Ownership Requirements

- Mỗi accounting service phải khai báo source-of-truth state rõ ràng trước khi implement storage và API.
- `ledger` là authoritative boundary cho posting truth và balance lineage.
- `reporting` không được trở thành source-of-truth cho transactional accounting state.
- `invoice`, `expense`, và `tax` chỉ publish integration outputs nằm trong ownership của mình.

## Gateway Integration Expectations

- `GraphQL Gateway` chỉ orchestration request tới accounting services.
- Gateway không giữ accounting business logic nặng, posting rules, hay tenant-specific workflow branching.
- Gateway phải tiếp tục áp dụng auth context propagation, public-safe error mapping, persisted query policy, demand controls, và correlation context hiện có.

## Observability and Audit Requirements

- Mọi accounting service phải log với structured fields tối thiểu gồm `service`, `requestId`, `traceId`, `tenantId`, `userId`, và `operationName` khi có thể.
- Security-sensitive hoặc boundary-rejection paths phải có audit or metric signal tương tự foundation services.
- Long-running or failure-prone operations phải emit đủ metadata để trace qua gateway và downstream paths.

## Versioning and Compatibility

- Internal HTTP contract changes phải giữ backward compatibility trong rollout window hoặc được version hóa rõ ràng.
- Event schema changes phải tăng `version` và được documented trước khi rollout.
- Không thay đổi shared auth context shape tùy tiện để phục vụ một accounting service riêng lẻ.
