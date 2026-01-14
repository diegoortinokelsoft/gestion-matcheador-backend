import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { User } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/types/request-user.type';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('register')
  async register(@User() user: RequestUser, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    return this.sessionsService.registerSession(user.id, {
      ip: ip ?? null,
      user_agent: typeof userAgent === 'string' ? userAgent : null,
    });
  }

  @Post('revoke')
  async revoke(@User() user: RequestUser, @Body() body: { session_id?: string }) {
    if (!body.session_id) {
      throw new BadRequestException('session_id is required');
    }
    await this.sessionsService.revokeSession(user.id, body.session_id);
    return { ok: true };
  }

  @Get('me')
  async me(@User() user: RequestUser) {
    return this.sessionsService.listSessions(user.id);
  }
}

