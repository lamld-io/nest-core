import { UseGuards } from "@nestjs/common"
import { Field, ObjectType, Query, Resolver } from "@nestjs/graphql"
import { CurrentUser, Roles, TenantRolesGuard, type TenantRequestContext } from "../../../../libs/platform-auth/src/index.js"
import { GqlJwtAuthGuard } from "./guards/gql-jwt-auth.guard.js"

@ObjectType()
class AuthContextView {
  @Field()
  userId!: string

  @Field()
  email!: string

  @Field()
  tenantId!: string

  @Field()
  membershipId!: string

  @Field(() => [String])
  roles!: string[]

  @Field(() => [String])
  permissions!: string[]
}

@Resolver(() => AuthContextView)
export class AuthResolver {
  @Roles("tenant_owner", "admin", "accountant", "auditor", "viewer")
  @UseGuards(GqlJwtAuthGuard, TenantRolesGuard)
  @Query(() => AuthContextView)
  me(@CurrentUser() currentUser: TenantRequestContext): AuthContextView {
    return currentUser
  }
}
