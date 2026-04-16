import { Controller, Get, Module } from "@nestjs/common"

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
  controllers: [GatewayHealthController],
})
export class GatewayHealthModule {}
