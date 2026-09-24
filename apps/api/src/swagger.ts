import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Events API')
    .setDescription(
      [
        'Events + RSVP API. NestJS · PostgreSQL · JWT.',
        '',
        '**Try it:** `POST /api/v1/auth/login` with `demo@events.dev` / `Password123!`,',
        'copy `accessToken`, click **Authorize**, then call any endpoint.',
        '',
        'Errors always look like `{ statusCode, error, message, path, timestamp }`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('docs', app, buildOpenApi(app), {
    jsonDocumentUrl: 'docs-json',
    customSiteTitle: 'Events API docs',
    swaggerOptions: { persistAuthorization: true },
  });
}
