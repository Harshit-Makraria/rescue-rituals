import { Controller, Get, Module, Redirect, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@SkipThrottle()
@Controller()
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiExcludeEndpoint()
  @Redirect('/docs', 302)
  root() {}

  /** Liveness + database check. Render's health check points here. */
  @Get('health')
  @ApiOkResponse({ schema: { example: { status: 'ok', db: 'up' } } })
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
