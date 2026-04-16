# ADR-002: Auth And Tenant Model

## Status

Accepted

## Context

Nền tảng là phần mềm kế toán multi-tenant. Rủi ro lớn nhất ở giai đoạn đầu là thiết kế sai ranh giới identity, membership, tenant context, và authorization, dẫn đến lẫn dữ liệu giữa tenant hoặc phải thiết kế lại khi thêm accounting services.

## Decision

- `User` là danh tính toàn cục.
- `Tenant` là tổ chức nghiệp vụ cấp cao nhất trong phase đầu.
- `Membership` nối `User` với `Tenant`.
- Vai trò và quyền được gắn theo tenant, không gắn toàn cục mặc định.
- Authentication dùng `JWT access token + refresh token`.
- `GraphQL Gateway` xác thực token và dựng request context gồm:
  - `userId`
  - `tenantId`
  - `membershipId`
  - `roles`
  - `permissions`
  - `requestId`
  - `traceId`
- Downstream services không được tin `tenantId` từ client nếu chưa qua lớp auth context đã xác thực.
- Authorization baseline dùng `tenant-scoped RBAC` với khả năng mở rộng sang permission set hoặc policy layer ở phase sau.

## Alternatives Considered

### Global RBAC only

- Lý do loại bỏ: không phù hợp với accounting SaaS multi-tenant.

### ABAC từ ngày đầu

- Lý do loại bỏ: quá phức tạp cho phase đầu, dễ làm chậm delivery.

### Session-only auth

- Lý do loại bỏ: kém phù hợp với stateless scaling giữa gateway và downstream services.

## Consequences

- Hỗ trợ một user thuộc nhiều tenant.
- Authz có thể kiểm tra ở gateway và service layer mà không đánh mất tenant boundary.
- JWT payload cần đủ tối thiểu để tránh phình token; các dữ liệu chi tiết hơn có thể tra từ auth/user service.

## Open Questions

- Một user có thể thuộc nhiều legal entity hoặc chi nhánh trong cùng tenant không?
- Có cần SSO/OIDC ngay từ phase đầu không?
- Permission model có cần phân quyền theo hành động kế toán tinh vi hơn ở phase 2 không?
