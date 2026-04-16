import { Controller, Get, Module } from "@nestjs/common"

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
  controllers: [UserHealthController],
})
export class UserHealthModule {}
