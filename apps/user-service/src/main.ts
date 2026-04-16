import "reflect-metadata"
import { ValidationPipe } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module.js"
import { createPlatformLogger } from "../../../libs/platform-logger/src/index.js"

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  app.useLogger(createPlatformLogger("user-service"))
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )
  app.enableShutdownHooks()
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3002)
}

void bootstrap()
