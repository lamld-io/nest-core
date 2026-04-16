import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo"

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        path: configService.getOrThrow<string>("gateway.graphqlPath"),
        graphiql: configService.get<boolean>("gateway.graphqlIdeEnabled") ?? true,
        autoSchemaFile: configService.getOrThrow<string>("gateway.graphqlSchemaFile"),
        sortSchema: true,
      }),
    }),
  ],
})
export class GatewayGraphqlModule {}
