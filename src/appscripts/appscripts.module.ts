import { Module } from '@nestjs/common';
import { AppscriptsClient } from './appscripts.client';
import { AppscriptsController } from './appscripts.controller';
import { AppscriptsService } from './appscripts.service';

@Module({
  controllers: [AppscriptsController],
  providers: [AppscriptsClient, AppscriptsService],
  exports: [AppscriptsClient, AppscriptsService],
})
export class AppscriptsModule {}

