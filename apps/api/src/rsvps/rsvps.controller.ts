import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt.guards';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { AttendeePage, AttendeesQuery, RsvpResponse } from './rsvps.dto';
import { RsvpsService } from './rsvps.service';

@ApiTags('rsvps')
@Controller('events/:id')
export class RsvpsController {
  constructor(private readonly rsvps: RsvpsService) {}

  /**
   * RSVP to an event. Returns `going` if you got a seat, otherwise `waitlisted`.
   * Safe to retry — calling it twice never double-books.
   */
  @Post('rsvp')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ type: RsvpResponse })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Event cancelled or already started' })
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RsvpResponse> {
    return this.rsvps.join(id, user.id);
  }

  /** Cancel your RSVP. Your seat goes to the next person on the waitlist. */
  @Delete('rsvp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ type: RsvpResponse })
  @ApiNotFoundResponse({ description: "You haven't RSVP'd" })
  leave(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RsvpResponse> {
    return this.rsvps.leave(id, user.id);
  }

  /** People going to this event, in the order they got their seat. Public. */
  @Get('attendees')
  @ApiOkResponse({ type: AttendeePage })
  @ApiNotFoundResponse()
  attendees(@Param('id', ParseUUIDPipe) id: string, @Query() query: AttendeesQuery): Promise<AttendeePage> {
    return this.rsvps.attendees(id, query);
  }
}
