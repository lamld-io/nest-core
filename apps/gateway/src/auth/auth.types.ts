import type { TenantRequestContext } from "../../../../libs/platform-auth/src/index.js"

export type GatewayAuthContext = {
  req: {
    user?: TenantRequestContext
  }
}
