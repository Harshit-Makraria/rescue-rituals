import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/** Shared by main.ts and the e2e tests so tests run the real pipeline. */
export function configureApp(app: NestExpressApplication) {
  // Render terminates TLS at its proxy; trust one hop so req.ip is the client.
  app.set('trust proxy', 1);
  // JSON API + Swagger UI: CSP adds nothing here and breaks the docs page.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.setGlobalPrefix('api/v1', { exclude: [{ path: '/', method: RequestMethod.GET }] });

  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // …and reject them (blocks mass assignment)
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
