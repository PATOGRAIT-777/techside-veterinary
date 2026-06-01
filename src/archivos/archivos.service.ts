import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = './uploads';
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

@Injectable()
export class ArchivosService {
  constructor() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File): string {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan PDF, JPEG y PNG.`,
      );
    }

    const extension = path.extname(file.originalname) || '';
    const filename = `${randomUUID()}${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    try {
      fs.writeFileSync(filePath, file.buffer);
    } catch {
      throw new InternalServerErrorException('Error al guardar el archivo');
    }

    return filePath;
  }

  deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Silently ignore — file may already be deleted or missing
    }
  }
}
