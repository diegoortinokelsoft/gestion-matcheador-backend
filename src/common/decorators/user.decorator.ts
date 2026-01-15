import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '../types/request-user.type';

export const User = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) return undefined;
    if (!data) return user;
    return user[data];
  },
);

