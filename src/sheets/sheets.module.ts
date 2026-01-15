import { Module } from '@nestjs/common';
import { AppscriptsModule } from '../appscripts/appscripts.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { AllowlistController } from './allowlist/allowlist.controller';
import { AllowlistService } from './allowlist/allowlist.service';
import { AbsencesController } from './absences/absences.controller';
import { AbsencesService } from './absences/absences.service';
import { LogsController } from './logs/logs.controller';
import { LogsService } from './logs/logs.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { VacationsController } from './vacations/vacations.controller';
import { VacationsService } from './vacations/vacations.service';

@Module({
  imports: [AppscriptsModule, UsersModule, RolesModule],
  controllers: [
    TasksController,
    VacationsController,
    AbsencesController,
    LogsController,
    AllowlistController,
  ],
  providers: [
    TasksService,
    VacationsService,
    AbsencesService,
    LogsService,
    AllowlistService,
  ],
})
export class SheetsModule {}

