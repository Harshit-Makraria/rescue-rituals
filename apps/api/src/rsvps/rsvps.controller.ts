import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guards';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { AttendeePage, AttendeesQuery, GuestList, RsvpDto, RsvpResponse } from './rsvps.dto';
import { RsvpsService } from './rsvps.service';

@ApiTags('rsvps')
@Controller('events/:id')
export class RsvpsController {
  constructor(private readonly rsvps: RsvpsService) {}

  /**
   * RSVP to an event, or update your RSVP (plus-ones, phone, note). You + your
   * plus-ones take seats together: `going` if they all fit, otherwise `waitlisted`.
   * Safe to retry — calling it twice never double-books. The body is optional.
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
  join(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RsvpDto,
  ): Promise<RsvpResponse> {
    return this.rsvps.join(id, user.id, dto);
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

  /** Everyone going or waitlisted, with contact details, plus-ones and notes. Host only. */
  @Get('guests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: GuestList })
  @ApiForbiddenResponse({ description: 'Not the host' })
  guests(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<GuestList> {
    return this.rsvps.guestList(id, user.id);
  }

  /** The guest list as a CSV download (formula-injection safe). Host only. */
  @Get('guests.csv')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'CSV file', schema: { type: 'string' } })
  @ApiForbiddenResponse({ description: 'Not the host' })
  async guestsCsv(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @Res() res: Response) {
    const { filename, body } = await this.rsvps.guestListCsv(id, user.id);
    res
      .type('text/csv; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .setHeader('Cache-Control', 'no-store')
      .send(body);
  }

  /** The waitlist, in the order people will be promoted. Host only. */
  @Get('waitlist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AttendeePage })
  @ApiForbiddenResponse({ description: 'Not the host' })
  waitlist(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<AttendeePage> {
    return this.rsvps.waitlist(id, user.id);
  }

  /** People going to this event, in the order they got their seat. Public. */
  @Get('attendees')
  @ApiOkResponse({ type: AttendeePage })
  @ApiNotFoundResponse()
  attendees(@Param('id', ParseUUIDPipe) id: string, @Query() query: AttendeesQuery): Promise<AttendeePage> {
    return this.rsvps.attendees(id, query);
  }
}
