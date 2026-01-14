import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { RequestUser } from '../common/types/request-user.type';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async assign(@Body() dto: AssignRoleDto) {
    await this.rolesService.assignRole(dto.userId, dto.role);
    return { ok: true };
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async revoke(@Body() dto: AssignRoleDto) {
    await this.rolesService.revokeRole(dto.userId, dto.role);
    return { ok: true };
  }

  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  async list(@Param('userId') userId: string, @User() requester?: RequestUser) {
    if (!requester) throw new ForbiddenException('Missing authenticated user');

    if (requester.id !== userId) {
      const requesterRoles = await this.rolesService.listRoles(requester.id);
      if (!requesterRoles.includes('admin')) {
        throw new ForbiddenException('Not allowed to view roles for other users');
      }
    }

    const roles = await this.rolesService.listRoles(userId);
    return { userId, roles };
  }
}

