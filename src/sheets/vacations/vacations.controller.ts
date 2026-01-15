import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { VacationsDeleteDto } from './dto/vacations-delete.dto';
import { VacationsListTeamDto } from './dto/vacations-list-team.dto';
import { VacationsListUserDto } from './dto/vacations-list-user.dto';
import { VacationsSetDto } from './dto/vacations-set.dto';
import { VacationsService } from './vacations.service';

@Controller('sheets/vacations')
export class VacationsController {
  constructor(private readonly vacationsService: VacationsService) {}

  @Post('list-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  async listAll() {
    return this.vacationsService.listAll();
  }

  @Post('list-user')
  @UseGuards(JwtAuthGuard)
  async listUser(@User() user: RequestUser, @Body() dto: VacationsListUserDto) {
    return this.vacationsService.listUser(user, dto);
  }

  @Post('list-team')
  @UseGuards(JwtAuthGuard)
  async listTeam(@User() user: RequestUser, @Body() dto: VacationsListTeamDto) {
    return this.vacationsService.listTeam(user, dto);
  }

  @Post('set')
  @UseGuards(JwtAuthGuard)
  async set(@User() user: RequestUser, @Req() req: Request, @Body() dto: VacationsSetDto) {
    return this.vacationsService.set(user, req, dto);
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  async delete(
    @User() user: RequestUser,
    @Req() req: Request,
    @Body() dto: VacationsDeleteDto,
  ) {
    return this.vacationsService.delete(user, req, dto);
  }
}
