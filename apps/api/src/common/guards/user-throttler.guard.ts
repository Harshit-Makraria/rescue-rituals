import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Rate-limit per user when a bearer token is present, per IP otherwise.
 *
 * Why: the web app calls this API from its server (BFF), so every browser user
 * shares the same Vercel egress IP. Keying on IP alone would throttle all users
 * together. The token is only *decoded* here (not verified) — it's a bucket key,
 * not an auth decision; the JWT guard still verifies it on protected routes.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const auth = (req as Request).headers?.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString());
        if (typeof payload.sub === 'string') return `user:${payload.sub}`;
      } catch {
        // fall through to IP
      }
    }
    return `ip:${req.ip}`;
  }
}
