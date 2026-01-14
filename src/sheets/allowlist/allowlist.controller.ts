import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { RequestUser } from '../../common/types/request-user.type';
import { AllowlistDisableDto } from './dto/allowlist-disable.dto';
import { AllowlistGetDto } from './dto/allowlist-get.dto';
import { AllowlistUpsertDto } from './dto/allowlist-upsert.dto';
import { AllowlistService } from './allowlist.service';

@Controller('allowlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AllowlistController {
  constructor(private readonly allowlistService: AllowlistService) {}

  @Post('get')
  async get(@Body() dto: AllowlistGetDto) {
    return this.allowlistService.get(dto.email);
  }

  @Post('list')
  async list() {
    return this.allowlistService.list();
  }

  @Post('upsert')
  async upsert(
    @User() user: RequestUser,
    @Req() req: Request,
    @Body() dto: AllowlistUpsertDto,
  ) {
    return this.allowlistService.upsert(user, req, dto);
  }

  @Post('disable')
  async disable(
    @User() user: RequestUser,
    @Req() req: Request,
    @Body() dto: AllowlistDisableDto,
  ) {
    return this.allowlistService.disable(user, req, dto.email);
  }
}

