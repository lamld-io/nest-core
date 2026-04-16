import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo"
import { createRequestCorrelationContext } from "../../../../libs/platform-observability/src/index.js"

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        path: configService.getOrThrow<string>("gateway.graphqlPath"),
        graphiql:
          process.env.NODE_ENV === "development" &&
          configService.get<boolean>("gateway.graphqlIdeEnabled") === true,
        autoSchemaFile: configService.getOrThrow<string>("gateway.graphqlSchemaFile"),
        sortSchema: true,
        context: ({ req }: { req: { headers?: Record<string, unknown>; user?: unknown } }) => ({
          req,
          correlation: createRequestCorrelationContext({
            headers: req.headers,
            serviceName: "gateway",
            operationName: "graphql.request",
          }),
        }),
      }),
    }),
  ],
})
export class GatewayGraphqlModule {}
