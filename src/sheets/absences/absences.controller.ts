import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { AbsencesCreateDto } from './dto/absences-create.dto';
import { AbsencesDeleteDto } from './dto/absences-delete.dto';
import { AbsencesListUserDto } from './dto/absences-list-user.dto';
import { AbsencesService } from './absences.service';

@Controller('sheets/absences')
export class AbsencesController {
  constructor(private readonly absencesService: AbsencesService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(
    @User() user: RequestUser,
    @Req() req: Request,
    @Body() dto: AbsencesCreateDto,
  ) {
    return this.absencesService.create(user, req, dto);
  }

  @Post('list-user')
  @UseGuards(JwtAuthGuard)
  async listUser(@User() user: RequestUser, @Body() dto: AbsencesListUserDto) {
    return this.absencesService.listUser(user, dto);
  }

  @Post('calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  async calendar() {
    return this.absencesService.calendar();
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  async delete(
    @User() user: RequestUser,
    @Req() req: Request,
    @Body() dto: AbsencesDeleteDto,
  ) {
    return this.absencesService.delete(user, req, dto);
  }

  @Post('cases')
  @UseGuards(JwtAuthGuard)
  async cases() {
    return this.absencesService.cases();
  }
}
