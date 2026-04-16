import { Controller, Get, Module } from "@nestjs/common"
import { GatewayMetricsController } from "./metrics.controller.js"

@Controller("health")
class GatewayHealthController {
  @Get()
  getHealth() {
    return {
      app: "gateway",
      status: "ok",
    }
  }

  @Get("ready")
  getReadiness() {
    return {
      app: "gateway",
      status: "ready",
    }
  }
}

@Module({
  controllers: [GatewayHealthController, GatewayMetricsController],
})
export class GatewayHealthModule {}
