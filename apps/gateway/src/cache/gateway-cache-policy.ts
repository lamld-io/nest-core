export const gatewayCacheBaseline = {
  responseCaching: "disabled-until-explicit-schema-aware-policy",
  graphqlInterceptorStrategy: "do-not-use-global-cacheinterceptor",
  recommendedScope: ["persisted-document-metadata", "downstream-read-model-fragments"],
} as const
