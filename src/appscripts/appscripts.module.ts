import { Module } from '@nestjs/common';
import { AppscriptsClient } from './appscripts.client';
import { AppscriptsGateway } from './appscripts.gateway';

@Module({
  providers: [AppscriptsClient, AppscriptsGateway],
  exports: [AppscriptsClient, AppscriptsGateway],
})
export class AppscriptsModule {}
