# ADR-006: Accounting Domain Boundaries

## Status

Accepted

## Context

Foundation phase đã chốt `GraphQL Gateway`, `auth-service`, `user-service`, tenant-aware auth, observability baseline, và gateway hardening. Bước tiếp theo không phải là nhảy ngay vào implementation accounting chi tiết, mà là chốt domain boundaries đủ rõ để service accounting đầu tiên có thể được thêm vào mà không làm đổi nền `GraphQL Gateway`, `tenant-scoped RBAC`, internal transport, hay correlation/audit contracts.

## Decision

- `GraphQL Gateway` tiếp tục là entry point duy nhất cho client và chỉ giữ orchestration, auth context propagation, error mapping, observability metadata, và API governance.
- Accounting business logic không được đặt trong gateway; gateway chỉ orchestration downstream services.
- `auth-service` tiếp tục sở hữu authentication, token issuance, và tenant identity boundary.
- `user-service` tiếp tục sở hữu profile và membership projection boundary.
- Các bounded context accounting phase đầu được chốt như sau:
  - `ledger`: source of truth cho journal, posting, account balance lineage, và accounting-period aware posting controls.
  - `invoice`: source of truth cho invoice lifecycle, payment status linkage, customer-facing billing documents, và receivable-oriented workflow metadata.
  - `expense`: source of truth cho expense capture, approval state, reimbursement/vendor payout preparation, và cost classification inputs.
  - `tax`: source of truth cho tax rule application, tax determination snapshots, filing-oriented aggregates, và compliance-specific adjustments.
  - `reporting`: read and aggregation domain cho financial statements, operational summaries, tenant-level dashboards, và cross-domain derived views; `reporting` không là source of truth cho ledger, invoice, expense, hay tax transactions.
- `ledger` là domain được ưu tiên triển khai đầu tiên nếu mục tiêu là bảo vệ accounting integrity và giữ các domain sau bám trên posting/source-of-truth chuẩn.
- `invoice` có thể là domain đầu tiên thay thế nếu product discovery chứng minh external billing workflow cần đi trước, nhưng vẫn phải publish các accounting-relevant events để `ledger` theo sau mà không đổi contract nền.
- Tất cả accounting domains phải tái sử dụng tenant-aware auth context hiện có gồm tối thiểu `userId`, `tenantId`, `membershipId`, `roles`, `permissions`, `requestId`, và `traceId`.
- Downstream accounting services không được tin `tenantId` hay security-sensitive context trực tiếp từ client nếu chưa đi qua auth context đã xác thực.

## Alternatives Considered

### One accounting service for all domains

- Lý do loại bỏ: gom `ledger`, `invoice`, `expense`, `tax`, và `reporting` vào một service sẽ làm ownership mờ, tăng coupling, và phá mục tiêu service expansion path.

### Start with reporting first

- Lý do loại bỏ: `reporting` phụ thuộc dữ liệu từ nhiều domain và nên là read/aggregation concern, không phải transactional source-of-truth domain đầu tiên.

### Put accounting orchestration inside gateway

- Lý do loại bỏ: mâu thuẫn với quyết định giữ gateway ở mức orchestration-only và sẽ biến gateway thành business logic host.

## Consequences

- Domain implementation tiếp theo có thể chọn `ledger` hoặc `invoice` với contract rõ ràng mà không đổi auth foundation.
- `reporting` sẽ phải tiêu thụ events hoặc read models từ các domain source-of-truth thay vì ghi đè ownership.
- Event taxonomy, internal HTTP contracts, và error mapping cho accounting domains phải giữ correlation metadata giống foundation services.
- Các quyết định sâu hơn như chart-of-accounts structure, posting rules, tax engine strategy, hay reporting materialization vẫn để phase domain implementation quyết định.

## Open Questions

- Product có cần `invoice` đi trước `ledger` để phục vụ go-to-market sớm không?
- `tax` có phải domain service riêng ngay từ đầu hay chỉ là subdomain trong `invoice`/`ledger` ở giai đoạn đầu?
- `reporting` sẽ dùng replicated read store hay query trực tiếp từ domain-owned projections trong phase đầu tiên?
