import { Injectable, UnauthorizedException } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser>(error: unknown, user: TUser | undefined) {
    if (error || !user) {
      throw error instanceof Error ? error : new UnauthorizedException("Authentication required")
    }

    return user
  }
}
