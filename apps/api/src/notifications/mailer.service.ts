import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Optional email channel via Resend's HTTP API. With no RESEND_API_KEY set,
 * emails are skipped (in-app notifications still work) — so local dev and the
 * demo deploy need no email provider.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled() {
    return Boolean(this.config.get('RESEND_API_KEY') && this.config.get('EMAIL_FROM'));
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.config.get('EMAIL_FROM'), to, subject, text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) this.logger.warn(`Email to ${to} failed: ${res.status}`);
    } catch (e) {
      // Email is best-effort; the in-app notification is the source of truth.
      this.logger.warn(`Email to ${to} failed: ${(e as Error).message}`);
    }
  }
}
