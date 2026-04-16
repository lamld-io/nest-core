# ADR-004: Transport And Eventing

## Status

Accepted

## Context

Phase đầu chỉ có `gateway`, `auth-service`, và `user-service`, nhưng vẫn cần chốt chuẩn giao tiếp sync/async để tránh sau này mỗi service chọn một cơ chế khác nhau.

## Decision

- Client giao tiếp với backend qua `GraphQL Gateway`.
- Gateway giao tiếp với downstream services bằng `internal HTTP` trong phase đầu.
- Không dùng gRPC ở phase đầu.
- Không dùng federation ở phase đầu.
- Eventing baseline dùng `NATS JetStream` cho:
  - audit events
  - security events
  - tenant lifecycle events
  - membership lifecycle events
- Không dùng async messaging cho hot path của login, token validation, hoặc membership lookup nền tảng.
- Event names phải theo domain, ví dụ:
  - `tenant.created`
  - `membership.role_changed`
  - `auth.login_failed`
- Event payload phải có version và correlation metadata.

## Alternatives Considered

### gRPC cho nội bộ ngay từ đầu

- Lý do loại bỏ: chi phí setup và debug cao hơn nhu cầu phase đầu.

### Kafka ngay từ đầu

- Lý do loại bỏ: ops complexity cao hơn mức cần thiết.

### No broker

- Lý do loại bỏ: không đủ tốt cho audit/security/lifecycle baseline về sau.

## Consequences

- HTTP contracts nội bộ cần được chuẩn hóa sớm.
- Event producers/consumers cần idempotency mindset từ đầu dù phase đầu có thể chưa viết đủ consumer logic.

## Open Questions

- Có cần dead-letter handling ngay ở phase 2 hay phase 3?
- Có cần schema registry hoặc event contract package riêng khi thêm accounting services không?
