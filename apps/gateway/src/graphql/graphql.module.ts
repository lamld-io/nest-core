import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo"
import type { GatewayHardeningConfig } from "../../../../libs/platform-config/src/app-config.js"
import { createRequestCorrelationContext } from "../../../../libs/platform-observability/src/index.js"
import { createTrustedDocumentsPlugin, resolvePersistedQueryPolicy } from "./persisted-queries.js"
import { buildGatewayValidationRules } from "./query-validation.js"

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...(() => {
          const hardening = configService.getOrThrow<GatewayHardeningConfig>("gateway.hardening")
          const persistedQueryPolicy = resolvePersistedQueryPolicy(
            hardening.graphql.persistedQueryMode
          )
          const trustedDocuments = new Set(hardening.graphql.trustedDocumentHashes)

          return {
            path: configService.getOrThrow<string>("gateway.graphqlPath"),
            graphiql:
              process.env.NODE_ENV === "development" &&
              configService.get<boolean>("gateway.graphqlIdeEnabled") === true,
            autoSchemaFile: configService.getOrThrow<string>("gateway.graphqlSchemaFile"),
            sortSchema: true,
            introspection: hardening.graphql.introspectionEnabled,
            validationRules: buildGatewayValidationRules({
              maxDepth: hardening.graphql.maxDepth,
              maxComplexity: hardening.graphql.maxComplexity,
              maxAliases: hardening.graphql.maxAliases,
            }),
            persistedQueries:
              persistedQueryPolicy.persistedQueries as ApolloDriverConfig["persistedQueries"],
            plugins: [createTrustedDocumentsPlugin(persistedQueryPolicy, trustedDocuments)],
            context: ({ req }: { req: { headers?: Record<string, unknown>; user?: unknown } }) => ({
              req,
              correlation: createRequestCorrelationContext({
                headers: req.headers,
                serviceName: "gateway",
                operationName: "graphql.request",
              }),
              persistedQueryPolicy,
              trustedDocuments,
            }),
          } satisfies ApolloDriverConfig
        })(),
      }),
    }),
  ],
})
export class GatewayGraphqlModule {}
