import { Controller, Get, Res } from "@nestjs/common"
import type { Response } from "express"
import { renderPlatformMetrics } from "../../../../libs/platform-observability/src/index.js"

@Controller()
export class GatewayMetricsController {
  @Get("metrics")
  async getMetrics(@Res() response: Response) {
    response.type("text/plain")
    response.send(await renderPlatformMetrics())
  }
}
