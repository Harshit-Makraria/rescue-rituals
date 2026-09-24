import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/**
 * Tags every request with an id (reusing an incoming X-Request-Id, e.g. from a
 * proxy or the web app) and writes one structured access-log line per request.
 * The id is echoed in the response header and in error bodies, so a user-facing
 * error can be traced straight to its log line.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  (req as Request & { id: string }).id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const started = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.originalUrl.endsWith('/health') && res.statusCode === 200) return; // keep-alive pings are noise
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const line = JSON.stringify({
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Math.round(ms),
      ip: req.ip,
    });
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.log(line);
  });
  next();
}
