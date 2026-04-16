import { Injectable } from "@nestjs/common"
import { PlatformJwtAuthGuard } from "../../../../../libs/platform-auth/src/index.js"

@Injectable()
export class GqlJwtAuthGuard extends PlatformJwtAuthGuard {}
