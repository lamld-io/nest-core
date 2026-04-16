import { type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import { GqlExecutionContext } from "@nestjs/graphql"

@Injectable()
export class PlatformJwtAuthGuard extends AuthGuard("jwt") {
  getRequest(context: ExecutionContext) {
    const gqlContext = GqlExecutionContext.create(context)
    return gqlContext.getContext().req
  }

  handleRequest<TUser>(error: unknown, user: TUser | undefined) {
    if (error || !user) {
      throw error instanceof Error ? error : new UnauthorizedException("Authentication required")
    }
    return user
  }
}
