import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { GqlExecutionContext } from "@nestjs/graphql"
import { AUTH_IS_PUBLIC_KEY, AUTH_ROLES_KEY, type MembershipRole } from "./constants.js"
import type { TenantRequestContext } from "./auth-context.js"

@Injectable()
export class TenantRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(AUTH_IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(AUTH_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const gqlContext = GqlExecutionContext.create(context)
    const request = gqlContext.getContext<{ req?: { user?: TenantRequestContext } }>().req
    const user = request?.user

    if (!user) {
      throw new ForbiddenException("Tenant context missing")
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role))
    if (!hasRole) {
      throw new ForbiddenException("Missing required role")
    }

    return true
  }
}
