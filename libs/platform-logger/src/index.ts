import {
  ConsoleLogger,
  Injectable,
  type LoggerService,
  Module,
  type NestInterceptor,
  type CallHandler,
  type ExecutionContext,
} from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { finalize, Observable } from "rxjs"
import type { TenantRequestContext } from "../../platform-auth/src/index.js"

export const platformLoggerModuleName = "platform-logger" as const

export const platformLoggerFields = [
  "timestamp",
  "level",
  "service",
  "message",
  "requestId",
  "traceId",
  "tenantId",
  "userId",
  "operationName",
  "errorCode",
] as const

export type PlatformLoggerField = (typeof platformLoggerFields)[number]

export type PlatformLogContext = {
  requestId?: string
  traceId?: string
  tenantId?: string
  userId?: string
  operationName?: string
  errorCode?: string
}

export const platformLoggerBaseline = {
  implementation: "di-managed-pino-adapter",
  bufferLogsAtBootstrap: true,
  redactFields: ["password", "accessToken", "refreshToken", "authorization"],
} as const

export function ensureRequestId(request: { headers?: Record<string, unknown>; requestId?: string }): string {
  const headerValue = request.headers?.["x-request-id"]
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    request.requestId = headerValue
    return headerValue
  }

  const requestId = randomUUID()
  request.requestId = requestId
  return requestId
}

export function extractTraceId(request: { headers?: Record<string, unknown> }): string | undefined {
  const traceParent = request.headers?.traceparent
  if (typeof traceParent !== "string") {
    return undefined
  }

  const [, traceId] = traceParent.split("-")
  return traceId
}

@Injectable()
export class PlatformLogger extends ConsoleLogger {
  constructor(private readonly serviceName: string) {
    super(serviceName)
  }

  logWithContext(level: "log" | "warn" | "error" | "debug", message: string, context: PlatformLogContext) {
    const payload = JSON.stringify({
      service: this.serviceName,
      message,
      ...context,
    })

    this[level](payload)
  }
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PlatformLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, unknown>; requestId?: string; user?: TenantRequestContext }>()
    const requestId = ensureRequestId(request)
    const traceId = extractTraceId(request)
    const operationName = `${context.getClass().name}.${context.getHandler().name}`
    const user = request.user

    this.logger.logWithContext("log", "request.started", {
      requestId,
      traceId,
      operationName,
      tenantId: user?.tenantId,
      userId: user?.userId,
    })

    return next.handle().pipe(
      finalize(() => {
        this.logger.logWithContext("log", "request.completed", {
          requestId,
          traceId,
          operationName,
          tenantId: user?.tenantId,
          userId: user?.userId,
        })
      })
    )
  }
}

@Module({
  providers: [
    {
      provide: PlatformLogger,
      useFactory: () => new PlatformLogger("platform"),
    },
    {
      provide: RequestLoggingInterceptor,
      useFactory: () => new RequestLoggingInterceptor(new PlatformLogger("platform")),
    },
  ],
  exports: [PlatformLogger, RequestLoggingInterceptor],
})
export class PlatformLoggerModule {}

export function createPlatformLogger(serviceName: string): LoggerService {
  return new PlatformLogger(serviceName)
}
