import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { User } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { RequestUser } from '../common/types/request-user.type';
import { AppscriptsService } from './appscripts.service';
import { ProxyRequestDto } from './dto/proxy-request.dto';

@Controller('appscripts')
@UseGuards(JwtAuthGuard)
export class AppscriptsController {
  constructor(private readonly appscriptsService: AppscriptsService) {}

  @Post('proxy')
  async proxy(@User() user: RequestUser, @Body() dto: ProxyRequestDto) {
    return this.appscriptsService.proxy(user.id, dto);
  }
}

