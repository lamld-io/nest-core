# ADR-005: Error And Config Contracts

## Status

Accepted

## Context

Repo hiện chưa có application error model hay config baseline. Nếu không chốt sớm, từng service sẽ tự đọc `process.env`, tự định nghĩa lỗi, và làm gateway mapping không nhất quán.

## Decision

- Tất cả config bắt buộc phải được parse và validate tại startup.
- Service code không được tự đọc `process.env` trực tiếp ngoài lớp config bootstrap.
- Config phải được cấp qua shared providers/modules.
- Internal HTTP errors phải có envelope thống nhất tối thiểu gồm:
  - `code`
  - `message`
  - `status`
  - `requestId`
  - `traceId`
  - `details` tùy chọn
- GraphQL layer phải map internal errors sang public-safe errors; không lộ stack trace hoặc secrets.
- Mọi app phase đầu phải có health/readiness contract.

## Alternatives Considered

### Ad hoc environment reads

- Lý do loại bỏ: dễ drift và khó test.

### Framework-default error shapes only

- Lý do loại bỏ: không đủ nhất quán cho gateway/internal-service boundaries.

## Consequences

- Startup failure là chủ đích khi thiếu biến môi trường bắt buộc.
- Error mapping sẽ cần exception filter hoặc adapter layer ở phase kế tiếp.
- Test baseline phải bao gồm config validation và protected-path error assertions.

## Open Questions

- Có cần error code taxonomy riêng cho auth/tenant flows ngay ở phase 2 không?
- Có cần config source ngoài `.env` như secret manager ở giai đoạn đầu không?
