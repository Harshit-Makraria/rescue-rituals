import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guards';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { CreateEventDto, EventPage, EventResponse, ListEventsQuery, UpdateEventDto } from './events.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** List upcoming published events (cursor-paginated). Public. */
  @Get()
  @ApiOkResponse({ type: EventPage })
  list(@Query() query: ListEventsQuery): Promise<EventPage> {
    return this.events.list(query);
  }

  /** Download the event as an iCalendar (.ics) file for Google, Apple or Outlook calendars. */
  @Get(':id/calendar.ics')
  @ApiProduces('text/calendar')
  @ApiOkResponse({ description: 'iCalendar file', schema: { type: 'string' } })
  @ApiNotFoundResponse()
  async calendar(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { filename, body } = await this.events.calendar(id);
    res
      .type('text/calendar; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .setHeader('Cache-Control', 'public, max-age=60')
      .send(body);
  }

  /** Get one event. Send a token to also get `myRsvpStatus`. */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: EventResponse })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null): Promise<EventResponse> {
    return this.events.findOne(id, user?.id);
  }

  /** Create an event. You become its host. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: EventResponse })
  @ApiUnauthorizedResponse()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto): Promise<EventResponse> {
    return this.events.create(user.id, dto);
  }

  /** Edit an event. Host only. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: EventResponse })
  @ApiForbiddenResponse({ description: 'Not the host' })
  @ApiConflictResponse({ description: 'Stale version, or capacity below attendees' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponse> {
    return this.events.update(id, user.id, dto);
  }

  /** Cancel (soft-delete) an event. Host only. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Not the host' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.events.remove(id, user.id);
  }
}
