# ADR-003: Observability Baseline

## Status

Accepted

## Context

Observability là ưu tiên bắt buộc từ phase đầu. Nếu logging, tracing, và metrics bị trì hoãn, hệ thống sẽ khó debug khi thêm gateway orchestration, auth flows, và tenant-aware authorization.

## Decision

- Logging dùng structured JSON logs.
- Logger implementation target là DI-managed logger adapter theo Nest custom logger pattern.
- Các trường log bắt buộc:
  - `timestamp`
  - `level`
  - `service`
  - `message`
  - `requestId`
  - `traceId`
  - `tenantId`
  - `userId`
  - `operationName`
  - `errorCode`
- Tracing dùng OpenTelemetry và phải bootstrap trước application code.
- Metrics dùng Prometheus-compatible metrics.
- Backends mặc định được chốt cho baseline:
  - logs -> Loki
  - traces -> Tempo
  - metrics -> Prometheus/Grafana
- Event metadata và internal HTTP metadata phải mang correlation identifiers.
- Không log raw password, raw token, hay secrets.

## Alternatives Considered

### Logs only

- Lý do loại bỏ: không đủ cho distributed request tracing giữa gateway và services.

### Vendor-specific observability ngay từ đầu

- Lý do loại bỏ: khóa nhà cung cấp quá sớm khi product còn greenfield.

## Consequences

- Bootstrap sequence cần tính đến tracing initialization order.
- Cần chuẩn hóa metadata propagation cho cả HTTP và event flows.
- Cần dashboard tối thiểu cho ba service phase đầu trước production pilot.

## Open Questions

- Có cần sampling strategy khác nhau giữa dev/staging/prod không?
- Có cần audit log immutable store tách riêng ngay ở phase 2 không?
