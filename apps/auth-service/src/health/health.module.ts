import { Controller, Get, Module } from "@nestjs/common"
import { AuthMetricsController } from "./metrics.controller.js"

@Controller("health")
class AuthHealthController {
  @Get()
  getHealth() {
    return {
      app: "auth-service",
      status: "ok",
    }
  }

  @Get("ready")
  getReadiness() {
    return {
      app: "auth-service",
      status: "ready",
    }
  }
}

@Module({
  controllers: [AuthHealthController, AuthMetricsController],
})
export class AuthHealthModule {}
