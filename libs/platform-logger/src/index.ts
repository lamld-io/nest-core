import { ConsoleLogger, Injectable, type LoggerService, Module } from "@nestjs/common"

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

export const platformLoggerBaseline = {
  implementation: "di-managed-pino-adapter",
  bufferLogsAtBootstrap: true,
  redactFields: ["password", "accessToken", "refreshToken", "authorization"],
} as const

@Injectable()
export class PlatformLogger extends ConsoleLogger {
  constructor(private readonly serviceName: string) {
    super(serviceName)
  }
}

@Module({
  providers: [
    {
      provide: PlatformLogger,
      useFactory: () => new PlatformLogger("platform"),
    },
  ],
  exports: [PlatformLogger],
})
export class PlatformLoggerModule {}

export function createPlatformLogger(serviceName: string): LoggerService {
  return new PlatformLogger(serviceName)
}
