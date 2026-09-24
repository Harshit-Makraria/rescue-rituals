import { Controller, Get, Injectable, Module, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guards';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { hostSelect, toEventResponse } from '../events/event.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { MeResponse, MyEventsResponse } from './users.dto';

@Injectable()
class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            events: { where: { deletedAt: null } },
            rsvps: { where: { status: 'going' } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    const { _count, ...rest } = user;
    return { ...rest, hostingCount: _count.events, goingCount: _count.rsvps };
  }

  /** Everything I host, including drafts and past events, newest first. */
  async hosting(userId: string): Promise<MyEventsResponse> {
    const events = await this.prisma.event.findMany({
      where: { creatorId: userId, deletedAt: null },
      include: hostSelect,
      orderBy: { startsAt: 'desc' },
      take: 100,
    });
    return { items: events.map((e) => toEventResponse(e)) };
  }

  /** Events I'm going to or waitlisted for, soonest first. */
  async rsvps(userId: string): Promise<MyEventsResponse> {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { userId, status: { in: ['going', 'waitlisted'] }, event: { deletedAt: null } },
      include: { event: { include: hostSelect } },
      orderBy: { event: { startsAt: 'asc' } },
      take: 100,
    });
    return { items: rsvps.map((r) => toEventResponse(r.event, r.status)) };
  }
}

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Your profile and counts. */
  @Get()
  @ApiOkResponse({ type: MeResponse })
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  /** Events you host (drafts and past included). */
  @Get('events')
  @ApiOkResponse({ type: MyEventsResponse })
  hosting(@CurrentUser() user: AuthUser) {
    return this.users.hosting(user.id);
  }

  /** Events you're going to or waitlisted for. Each item has `myRsvpStatus`. */
  @Get('rsvps')
  @ApiOkResponse({ type: MyEventsResponse })
  rsvps(@CurrentUser() user: AuthUser) {
    return this.users.rsvps(user.id);
  }
}

@Module({ controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
