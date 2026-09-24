import { Controller, Get, Global, HttpCode, Module, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guards';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { MailerService } from './mailer.service';
import { ListNotificationsQuery, NotificationPage } from './notifications.dto';
import { NotificationsService } from './notifications.service';
import { RemindersService } from './reminders.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/notifications')
class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Your latest 50 notifications (reminders, waitlist promotions, event changes) and the unread count. */
  @Get()
  @ApiOkResponse({ type: NotificationPage })
  list(@CurrentUser() user: AuthUser, @Query() query: ListNotificationsQuery): Promise<NotificationPage> {
    return this.notifications.list(user.id, query.unread);
  }

  /** Mark every notification as read. */
  @Post('read-all')
  @HttpCode(204)
  @ApiNoContentResponse()
  markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    return this.notifications.markAllRead(user.id);
  }

  /** Mark one notification as read. */
  @Post(':id/read')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  markRead(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.notifications.markRead(user.id, id);
  }
}

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RemindersService, MailerService],
  exports: [NotificationsService, RemindersService],
})
export class NotificationsModule {}
