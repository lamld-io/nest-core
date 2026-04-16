import { Module } from "@nestjs/common"
import { UserHealthModule } from "./health/health.module.js"
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
    UserHealthModule,
  ],
})
export class AppModule {}
