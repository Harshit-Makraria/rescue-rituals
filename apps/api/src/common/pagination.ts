import { BadRequestException } from '@nestjs/common';

/**
 * Opaque keyset cursor: base64url("<ISO timestamp>|<uuid>").
 * Keyset beats OFFSET: stable while rows are inserted, and O(log n) on deep pages.
 */
export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { at: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const at = new Date(iso);
  if (!id || Number.isNaN(at.getTime())) throw new BadRequestException('Invalid cursor');
  return { at, id };
}
