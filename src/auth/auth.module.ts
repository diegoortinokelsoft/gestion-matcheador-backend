import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AppscriptsModule } from '../appscripts/appscripts.module';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtStrategy } from './strategies/supabase-jwt.strategy';

@Module({
  imports: [PassportModule, UsersModule, RolesModule, AppscriptsModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtStrategy, RateLimitService],
  exports: [AuthService],
})
export class AuthModule {}
