import { Module } from "@nestjs/common"
import { UserHealthModule } from "./health/health.module.js"
import { MembershipModule } from "./membership/membership.module.js"
import {
  platformAppConfig,
  PlatformConfigModule,
} from "../../../libs/platform-config/src/index.js"
import { PlatformLoggerModule } from "../../../libs/platform-logger/src/index.js"
import { PlatformObservabilityModule } from "../../../libs/platform-observability/src/index.js"

@Module({
  imports: [
    PlatformConfigModule.register(platformAppConfig.userService),
    PlatformLoggerModule,
    PlatformObservabilityModule,
    MembershipModule,
    UserHealthModule,
  ],
})
export class AppModule {}
