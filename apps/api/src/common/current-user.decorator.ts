import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
}

/** The authenticated user, or null on routes guarded by OptionalJwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | null => ctx.switchToHttp().getRequest().user ?? null,
);
