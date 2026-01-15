import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppscriptsModule } from './appscripts/appscripts.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { RolesModule } from './roles/roles.module';
import { SessionsModule } from './sessions/sessions.module';
import { SupabaseModule } from './supabase/supabase.module';
import { SheetsModule } from './sheets/sheets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SessionsModule,
    AppscriptsModule,
    SheetsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
