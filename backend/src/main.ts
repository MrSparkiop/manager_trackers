import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

const cookieParser = require('cookie-parser')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(cookieParser())

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
        .split(',')
        .map(o => o.trim())
      if (!origin || allowed.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`))
      }
    },
    credentials: true,
  })

  // Swagger setup BEFORE global prefix
  const config = new DocumentBuilder()
    .setTitle('TrackFlow API')
    .setDescription('Full API documentation for TrackFlow — schedule and project management app')
    .setVersion('2.0.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('projects', 'Project management')
    .addTag('tasks', 'Task management')
    .addTag('time-tracker', 'Time tracking')
    .addTag('calendar', 'Calendar events')
    .addCookieAuth('access_token')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'TrackFlow API Docs',
    customCss: `
      .topbar { background-color: #0f172a !important; }
      .topbar-wrapper img { display: none; }
      .topbar-wrapper::after { content: '📋 TrackFlow API'; color: white; font-size: 18px; font-weight: bold; }
      body { background-color: #030712; }
      .swagger-ui { color: #e2e8f0; }
    `,
  })

  // Global prefix AFTER Swagger
  app.setGlobalPrefix('api')

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`🚀 Backend running on http://localhost:${port}`)
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`)
}
bootstrap()