import { Injectable } from "@nestjs/common"
import { PlatformLogger } from "../../platform-logger/src/index.js"
import { platformAuditCounter } from "./metrics.js"
import type { AuditEvent } from "./audit-events.js"

@Injectable()
export class AuditService {
  constructor(private readonly logger: PlatformLogger) {}

  record(event: AuditEvent): void {
    platformAuditCounter.inc({
      service: event.service,
      eventType: event.type,
      outcome: event.outcome,
    })

    this.logger.logWithContext("log", `audit.${event.type}`, {
      requestId: event.requestId,
      traceId: event.traceId,
      tenantId: event.tenantId,
      userId: event.userId,
      operationName: event.type,
    })
  }
}
