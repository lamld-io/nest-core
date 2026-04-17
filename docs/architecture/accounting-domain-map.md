# Accounting Domain Map

## Purpose

Tài liệu này chuyển Phase 6 từ mức “định hướng trong PRD” sang mức “implementation-facing map” để đội phát triển có thể chọn service accounting đầu tiên mà không phải mở lại các quyết định nền auth, tenant, transport, và observability.

## Domain Matrix

| Domain | Purpose | Owned data concepts | Upstream dependencies | Downstream outputs | Candidate service boundary | Forbidden responsibilities |
|---|---|---|---|---|---|---|
| ledger | Transactional accounting core | chart of accounts references, journals, entries, postings, posting periods, balance lineage | auth context, tenant metadata, invoice/expense/tax domain events as inputs | posting confirmations, balance events, financial-state signals | dedicated `ledger-service` | user auth ownership, gateway orchestration, reporting-only presentation logic |
| invoice | Billing and receivable workflows | invoices, line items, billing states, due dates, payment references, customer billing snapshots | auth context, tenant context, customer/master data if added later | invoice lifecycle events, receivable status, ledger posting requests/events | dedicated `invoice-service` | direct ownership of chart of accounts, final reporting aggregates |
| expense | Spend capture and approval workflows | expense claims, receipts, categories, approval states, reimbursement/vendor payout preparation | auth context, membership/approval roles, tenant policy data | approved expense events, payable-oriented classification signals | dedicated `expense-service` | final tax authority rules, gateway auth concerns |
| tax | Tax calculation and compliance support | tax rules, tax determination snapshots, tax adjustments, filing aggregates | invoice and expense source events, ledger posting context, tenant jurisdiction settings | tax calculation outputs, compliance aggregates, tax journal hints | dedicated `tax-service` or deferred specialized service | source ownership for invoices or expenses |
| reporting | Read and aggregation domain | statement views, KPI rollups, dashboards, derived tenant reporting views | ledger, invoice, expense, and tax projections/events | read models and exported reporting artifacts | dedicated `reporting-service` or reporting module later | source-of-truth writes for accounting transactions |

## Rollout Heuristics

### Recommended rollout order

1. `ledger`
2. `invoice`
3. `expense`
4. `tax`
5. `reporting`

Lý do:
- `ledger` tạo accounting core và posting boundary ổn định cho các domain transactional khác.
- `invoice` và `expense` là upstream transactional producers phù hợp sau khi có posting contract rõ.
- `tax` nên bám vào invoice/expense/ledger flows thực tế thay vì đoán sớm toàn bộ complexity.
- `reporting` đi sau vì phụ thuộc aggregate/read concerns từ nhiều domain.

### Alternate rollout path

Nếu product pressure ưu tiên customer billing sớm, có thể triển khai `invoice` trước `ledger`, nhưng chỉ khi invoice contract bắt buộc phát ra các integration outputs đủ rõ để `ledger` theo sau mà không đổi ownership semantics.

## Boundary Rules

- Mỗi domain service phải nhận tenant-aware request context từ gateway hoặc internal trusted caller chain.
- Mỗi domain service phải giữ ownership rõ cho state writes của mình.
- Không domain nào ngoài `ledger` được tự nhận ownership cuối cùng của accounting posting truth.
- `reporting` chỉ đọc, tổng hợp, và xuất view; không viết ngược vào transactional source-of-truth state.

## Integration Notes

- `GraphQL Gateway` giữ nhiệm vụ orchestration, không trực tiếp encode accounting workflow policy.
- `auth-service` và `user-service` vẫn là shared platform dependencies cho tất cả accounting services.
- Event contracts phải mang version và correlation metadata để future replay, debugging, và auditability không bị gãy.

## Implementation Checklist

- Mỗi domain mới phải ghi rõ ownership trước khi scaffold code.
- Mỗi contract mới phải chỉ ra domain nào là source-of-truth.
- Mỗi integration decision phải chỉ ra vì sao không đẩy business logic vào gateway.
