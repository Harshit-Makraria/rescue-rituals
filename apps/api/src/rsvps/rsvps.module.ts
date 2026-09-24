import { Module } from '@nestjs/common';
import { RsvpsController } from './rsvps.controller';
import { RsvpsService } from './rsvps.service';

@Module({
  controllers: [RsvpsController],
  providers: [RsvpsService],
})
export class RsvpsModule {}
