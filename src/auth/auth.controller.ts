import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common';
import { RolesRepository } from '../roles/roles.repository';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  if (!token) return null;
  return token.trim();
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rolesRepository: RolesRepository,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Headers('authorization') authorizationHeader?: string,
  ) {
    const token = extractBearerToken(authorizationHeader);

    if (token) {
      const caller = await this.authService.validateAccessToken(token);
      const callerRoles = await this.rolesRepository.listRoles(caller.id);
      if (!callerRoles.includes('admin')) {
        throw new ForbiddenException('Admin role required');
      }

      return this.authService.register(dto);
    }

    const hasAnyAssignments = await this.rolesRepository.hasAnyAssignments();
    if (hasAnyAssignments) {
      throw new ForbiddenException('Admin role required');
    }

    return this.authService.register(dto, { bootstrap: true });
  }
}

