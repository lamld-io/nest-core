import { Controller, Get, Module } from "@nestjs/common"
import { UserMetricsController } from "./metrics.controller.js"

@Controller("health")
class UserHealthController {
  @Get()
  getHealth() {
    return {
      app: "user-service",
      status: "ok",
    }
  }

  @Get("ready")
  getReadiness() {
    return {
      app: "user-service",
      status: "ready",
    }
  }
}

@Module({
  controllers: [UserHealthController, UserMetricsController],
})
export class UserHealthModule {}
