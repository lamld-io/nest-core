import { Injectable, type ExecutionContext } from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { ThrottlerGuard } from "@nestjs/throttler"

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<string>() === "graphql") {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        req?: Record<string, any>
        res?: Record<string, any>
      }>()

      return {
        req: gqlContext.req ?? {},
        res: gqlContext.res ?? gqlContext.req?.res ?? {},
      }
    }

    const http = context.switchToHttp()
    return {
      req: http.getRequest<Record<string, any>>() ?? {},
      res: http.getResponse<Record<string, any>>() ?? {},
    }
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip ?? req.socket?.remoteAddress ?? req.ips?.[0] ?? "unknown"
  }
}
