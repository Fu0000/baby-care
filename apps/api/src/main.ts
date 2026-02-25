import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  const allowedOrigins = parseAllowedOrigins(config)

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      // Non-browser requests (e.g. curl / server-to-server) usually have no Origin.
      if (!origin) {
        callback(null, true)
        return
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false)
    },
    credentials: true,
  })

  const port = Number(config.get<string>('PORT', '3000'))
  await app.listen(port)
  console.log(`[api] listening at http://localhost:${port}`)
}

void bootstrap()

function parseAllowedOrigins(config: ConfigService): Set<string> {
  const raw =
    config.get<string>('CORS_ORIGINS') ??
    config.get<string>('CORS_ORIGIN') ??
    'http://localhost:5173'

  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}
