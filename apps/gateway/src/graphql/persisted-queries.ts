import type { PersistedQueryMode } from "../../../../libs/platform-config/src/app-config.js"
import { GraphQLError } from "graphql"

export type PersistedQueryPolicy = {
  mode: PersistedQueryMode
  persistedQueries: false | { ttl: number }
  enforceTrustedDocuments: boolean
}

export type TrustedDocumentsPlugin = {
  requestDidStart(): Promise<{
    didResolveOperation(requestContext: { request: PersistedQueryRequest }): Promise<void>
  }>
}

type PersistedQueryRequest = {
  query?: string
  extensions?: {
    persistedQuery?: {
      sha256Hash?: string
    }
  }
}

export function resolvePersistedQueryPolicy(mode: PersistedQueryMode): PersistedQueryPolicy {
  if (mode === "apq") {
    return {
      mode,
      persistedQueries: { ttl: 300 },
      enforceTrustedDocuments: false,
    }
  }

  if (mode === "trusted-documents") {
    return {
      mode,
      persistedQueries: { ttl: 300 },
      enforceTrustedDocuments: true,
    }
  }

  return {
    mode: "none",
    persistedQueries: false,
    enforceTrustedDocuments: false,
  }
}

export function extractPersistedQueryHash(request: PersistedQueryRequest): string | null {
  const hash = request.extensions?.persistedQuery?.sha256Hash
  return typeof hash === "string" && hash.trim().length > 0 ? hash.trim() : null
}

export function assertTrustedDocumentRequest(
  request: PersistedQueryRequest,
  policy: PersistedQueryPolicy,
  trustedDocuments: ReadonlySet<string>
): void {
  if (!policy.enforceTrustedDocuments) {
    return
  }

  const hash = extractPersistedQueryHash(request)

  if (!hash || !trustedDocuments.has(hash)) {
    throw new GraphQLError("Only trusted persisted queries are allowed")
  }
}

export function createTrustedDocumentsPlugin(
  policy: PersistedQueryPolicy,
  trustedDocuments: ReadonlySet<string>
): TrustedDocumentsPlugin {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          assertTrustedDocumentRequest(
            requestContext.request as PersistedQueryRequest,
            policy,
            trustedDocuments
          )
        },
      }
    },
  }
}
