/**
 * Writes openapi.json without starting the server or touching the database.
 * The web app generates its typed API client from this file.
 *   npm run openapi
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildOpenApi } from './swagger';

process.env.DATABASE_URL ??= 'postgresql://unused:unused@localhost:5432/unused';
process.env.JWT_ACCESS_SECRET ??= 'openapi-generation-only';
process.env.JWT_REFRESH_SECRET ??= 'openapi-generation-only';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  const out = join(__dirname, '..', 'openapi.json');
  writeFileSync(out, JSON.stringify(buildOpenApi(app), null, 2));
  await app.close();
  console.log(`Wrote ${out}`);
}

main();
