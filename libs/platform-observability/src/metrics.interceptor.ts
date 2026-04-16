import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common"
import { catchError, Observable, throwError } from "rxjs"
import { platformRequestCounter } from "./metrics.js"

@Injectable()
export class PlatformMetricsInterceptor implements NestInterceptor {
  constructor(private readonly serviceName: string) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        platformRequestCounter.inc({ service: this.serviceName, outcome: "failed" })
        return throwError(() => error)
      })
    )
  }
}
