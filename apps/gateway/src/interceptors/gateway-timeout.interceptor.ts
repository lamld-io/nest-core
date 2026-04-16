import {
  RequestTimeoutException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { Observable, TimeoutError, catchError, throwError, timeout } from "rxjs"
import { type AuditService, auditEventTypes, createRequestCorrelationContext } from "../../../../libs/platform-observability/src/index.js"
import { PlatformLogger } from "../../../../libs/platform-logger/src/index.js"

export class GatewayTimeoutInterceptor implements NestInterceptor {
  constructor(
    private readonly requestTimeoutMs: number,
    private readonly logger = new PlatformLogger("gateway"),
    private readonly auditService?: Pick<AuditService, "record">
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = this.getRequest(context)
    const correlation = createRequestCorrelationContext({
      headers: request.headers,
      serviceName: "gateway",
      operationName: this.getOperationName(context),
    })

    return next.handle().pipe(
      timeout(this.requestTimeoutMs),
      catchError((error: unknown) => {
        if (!(error instanceof TimeoutError)) {
          return throwError(() => error)
        }

        this.auditService?.record({
          type: auditEventTypes.gatewayRequestTimedOut,
          service: "gateway",
          requestId: correlation.requestId,
          traceId: correlation.traceId,
          outcome: "failure",
          details: {
            operationName: correlation.operationName,
            timeoutMs: this.requestTimeoutMs,
          },
        })

        this.logger.logWithContext("warn", "gateway.request_timed_out", {
          requestId: correlation.requestId,
          traceId: correlation.traceId,
          operationName: correlation.operationName,
        })

        return throwError(
          () => new RequestTimeoutException("Gateway request timed out before completion")
        )
      })
    )
  }

  private getRequest(context: ExecutionContext): { headers?: Record<string, unknown> } {
    if (context.getType<string>() === "graphql") {
      return GqlExecutionContext.create(context).getContext<{ req?: { headers?: Record<string, unknown> } }>()
        .req ?? {}
    }

    return context.switchToHttp().getRequest<{ headers?: Record<string, unknown> }>() ?? {}
  }

  private getOperationName(context: ExecutionContext): string {
    if (context.getType<string>() === "graphql") {
      return `graphql.${context.getHandler().name}`
    }

    return `${context.getClass().name}.${context.getHandler().name}`
  }
}
