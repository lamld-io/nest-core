import { randomUUID } from "node:crypto"

export type RequestCorrelationContext = {
  requestId: string
  traceId?: string
  serviceName: string
  operationName?: string
}

export function createRequestCorrelationContext(input: {
  headers?: Record<string, unknown>
  serviceName: string
  operationName?: string
}): RequestCorrelationContext {
  const requestIdHeader = input.headers?.["x-request-id"]
  const traceParent = input.headers?.traceparent

  return {
    requestId:
      typeof requestIdHeader === "string" && requestIdHeader.trim().length > 0
        ? requestIdHeader
        : randomUUID(),
    traceId: typeof traceParent === "string" ? traceParent.split("-")[1] : undefined,
    serviceName: input.serviceName,
    operationName: input.operationName,
  }
}
