import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

type SupabaseLikeError = {
  message?: string;
  status?: number;
  code?: string;
};

export function throwIfSupabaseError(
  error: SupabaseLikeError | null | undefined,
  fallbackMessage = 'Supabase error',
): void {
  if (!error) return;

  const message = error.message || fallbackMessage;
  const status = error.status;

  if (status === 401) throw new UnauthorizedException(message);
  if (status && status >= 400 && status < 500) throw new BadRequestException(message);
  throw new InternalServerErrorException(message);
}

