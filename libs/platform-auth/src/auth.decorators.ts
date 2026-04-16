import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { AUTH_IS_PUBLIC_KEY, AUTH_ROLES_KEY, type MembershipRole } from "./constants.js"
import type { TenantRequestContext } from "./auth-context.js"

function getRequestUser(context: ExecutionContext): TenantRequestContext | undefined {
  const gqlContext = GqlExecutionContext.create(context)
  return gqlContext.getContext<{ req?: { user?: TenantRequestContext } }>().req?.user
}

export const Public = () => SetMetadata(AUTH_IS_PUBLIC_KEY, true)

export const Roles = (...roles: MembershipRole[]) => SetMetadata(AUTH_ROLES_KEY, roles)

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => getRequestUser(context))

export const TenantContext = createParamDecorator((_: unknown, context: ExecutionContext) => getRequestUser(context))
