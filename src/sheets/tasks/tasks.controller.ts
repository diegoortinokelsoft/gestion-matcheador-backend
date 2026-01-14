import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { TasksDeleteMultipleDto } from './dto/tasks-delete-multiple.dto';
import { TasksSetMultipleDto } from './dto/tasks-set-multiple.dto';
import { TasksService } from './tasks.service';

@Controller('sheets/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('list')
  @UseGuards(JwtAuthGuard)
  async list(@User() user: RequestUser) {
    return this.tasksService.list(user);
  }

  @Post('set-multiple')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  async setMultiple(
    @User() user: RequestUser,
    @Req() req: Request,
    @Body() dto: TasksSetMultipleDto,
  ) {
    return this.tasksService.setMultiple(user, req, dto);
  }

  @Post('delete-multiple')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  async deleteMultiple(
    @User() user: RequestUser,
    @Req() req: Request,
    @Body() dto: TasksDeleteMultipleDto,
  ) {
    return this.tasksService.deleteMultiple(user, req, dto);
  }
}

