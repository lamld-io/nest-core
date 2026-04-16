# ADR-001: Workspace Structure

## Status

Accepted

## Context

Project hiện chưa có codebase sản phẩm NestJS, nhưng phase đầu cần chốt cấu trúc monorepo cho `gateway`, `auth-service`, `user-service`, và các thư viện cross-cutting. Nếu không chốt sớm, mỗi service có thể tự dựng toolchain, config, và import boundary riêng, dẫn đến khó maintain và khó scale.

## Decision

- Dùng một Nest workspace theo mô hình monorepo.
- Các deployable apps đặt dưới `apps/`.
- Các shared libraries đặt dưới `libs/`.
- Root repo giữ `package.json`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, và các script chuẩn hóa.
- Phase đầu chỉ chốt ba app:
  - `apps/gateway`
  - `apps/auth-service`
  - `apps/user-service`
- Phase đầu chỉ chốt ba shared libs:
  - `libs/platform-config`
  - `libs/platform-logger`
  - `libs/platform-observability`

## Alternatives Considered

### Modular monolith

- Ưu điểm: ít vận hành hơn.
- Lý do loại bỏ: không phù hợp với quyết định kiến trúc đã chọn trong PRD là microservices + GraphQL gateway.

### Nhiều repo riêng cho từng service

- Ưu điểm: service isolation mạnh.
- Lý do loại bỏ: phase đầu cần chia sẻ config, auth conventions, observability baseline, và tăng tốc khởi động dự án.

## Consequences

- Tăng khả năng reuse cho config, logging, observability.
- Giảm chi phí đồng bộ convention giữa services.
- Cho phép tách deploy độc lập mà vẫn giữ một toolchain chung.
- Cần governance rõ để tránh `libs/` trở thành nơi chứa business logic dùng chung bừa bãi.

## Open Questions

- Có cần thêm `libs/common-contracts` ở phase 2 không?
- Có cần chia `libs/platform-auth` riêng ở phase 2 hay giữ trong app-level trước?
