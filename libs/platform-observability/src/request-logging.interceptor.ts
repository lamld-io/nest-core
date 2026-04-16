import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common"
import { finalize, Observable } from "rxjs"
import { PlatformLogger } from "../../platform-logger/src/index.js"
import { platformRequestCounter } from "./metrics.js"
import { createRequestCorrelationContext } from "./request-context.js"

@Injectable()
export class PlatformRequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PlatformLogger, private readonly serviceName: string) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, unknown>
      user?: { tenantId?: string; userId?: string }
    }>()

    const correlation = createRequestCorrelationContext({
      headers: request.headers,
      serviceName: this.serviceName,
      operationName: `${context.getClass().name}.${context.getHandler().name}`,
    })

    this.logger.logWithContext("log", "request.started", {
      requestId: correlation.requestId,
      traceId: correlation.traceId,
      operationName: correlation.operationName,
      tenantId: request.user?.tenantId,
      userId: request.user?.userId,
    })

    return next.handle().pipe(
      finalize(() => {
        platformRequestCounter.inc({ service: this.serviceName, outcome: "completed" })
        this.logger.logWithContext("log", "request.completed", {
          requestId: correlation.requestId,
          traceId: correlation.traceId,
          operationName: correlation.operationName,
          tenantId: request.user?.tenantId,
          userId: request.user?.userId,
        })
      })
    )
  }
}
