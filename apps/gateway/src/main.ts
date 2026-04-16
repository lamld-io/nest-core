import "reflect-metadata"
import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module.js"
import {
  createPlatformLogger,
  PlatformLogger,
  RequestLoggingInterceptor,
} from "../../../libs/platform-logger/src/index.js"
import {
  bootstrapPlatformInstrumentation,
  PlatformMetricsInterceptor,
} from "../../../libs/platform-observability/src/index.js"

async function bootstrap(): Promise<void> {
  await bootstrapPlatformInstrumentation()

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  app.useLogger(createPlatformLogger("gateway"))
  const logger = app.get(PlatformLogger)
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(new PlatformLogger("gateway")),
    new PlatformMetricsInterceptor("gateway")
  )
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )
  app.enableShutdownHooks()
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000)
}

void bootstrap()
