import { BadRequestException } from '@nestjs/common';

export interface CitasCursor {
  fecha: string;
  horaInicio: string;
  id: string;
}

export function encodeCursor(cursor: CitasCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(cursorStr: string): CitasCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursorStr, 'base64url').toString('utf-8'),
    ) as unknown;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('fecha' in parsed) ||
      !('horaInicio' in parsed) ||
      !('id' in parsed)
    ) {
      throw new BadRequestException('Invalid cursor format');
    }

    const cursor = parsed as Record<string, unknown>;

    if (
      typeof cursor.fecha !== 'string' ||
      typeof cursor.horaInicio !== 'string' ||
      typeof cursor.id !== 'string'
    ) {
      throw new BadRequestException('Invalid cursor format');
    }

    return {
      fecha: cursor.fecha,
      horaInicio: cursor.horaInicio,
      id: cursor.id,
    };
  } catch {
    throw new BadRequestException('Invalid cursor format');
  }
}

// ── Admin cursor helpers ──

export interface AdminCursor {
  nombre: string;
  id: string;
}

export function encodeAdminCursor(cursor: AdminCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeAdminCursor(cursorStr: string): AdminCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursorStr, 'base64url').toString('utf-8'),
    ) as unknown;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('nombre' in parsed) ||
      !('id' in parsed)
    ) {
      throw new BadRequestException('Invalid cursor format');
    }

    const cursor = parsed as Record<string, unknown>;

    if (typeof cursor.nombre !== 'string' || typeof cursor.id !== 'string') {
      throw new BadRequestException('Invalid cursor format');
    }

    return {
      nombre: cursor.nombre,
      id: cursor.id,
    };
  } catch {
    throw new BadRequestException('Invalid cursor format');
  }
}
