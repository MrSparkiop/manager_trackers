import { Module } from '@nestjs/common';
import { TimeTrackerService } from './time-tracker.service';
import { TimeTrackerController } from './time-tracker.controller';

@Module({
  providers: [TimeTrackerService],
  controllers: [TimeTrackerController],
})
export class TimeTrackerModule {}