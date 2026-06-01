import { Readable } from 'stream';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ArchivosService } from './archivos.service';

describe('ArchivosService', () => {
  let service: ArchivosService;
  const uploadsDir = 'uploads';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArchivosService],
    }).compile();

    service = module.get<ArchivosService>(ArchivosService);

    // Clean uploads directory before each test
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    }
  });

  afterAll(() => {
    // Clean up uploads directory after all tests
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile', () => {
    it('should save a PDF file with UUID filename', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'addressDoc',
        originalname: 'direccion.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('pdf content'),
        stream: undefined as unknown as Readable,
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.saveFile(mockFile);

      expect(fs.existsSync(result)).toBe(true);
      expect(path.extname(result)).toBe('.pdf');
      expect(path.dirname(result)).toBe(uploadsDir);
    });

    it('should save a JPEG file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'identityDoc',
        originalname: 'identidad.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('jpeg content'),
        stream: undefined as unknown as Readable,
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.saveFile(mockFile);

      expect(fs.existsSync(result)).toBe(true);
      expect(path.extname(result)).toBe('.jpg');
    });

    it('should save a PNG file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'identityDoc',
        originalname: 'identidad.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('png content'),
        stream: undefined as unknown as Readable,
        destination: '',
        filename: '',
        path: '',
      };

      const result = service.saveFile(mockFile);

      expect(fs.existsSync(result)).toBe(true);
      expect(path.extname(result)).toBe('.png');
    });

    it('should throw BadRequestException for invalid MIME type', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'addressDoc',
        originalname: 'virus.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        size: 1024,
        buffer: Buffer.from('evil content'),
        stream: undefined as unknown as Readable,
        destination: '',
        filename: '',
        path: '',
      };

      expect(() => service.saveFile(mockFile)).toThrow(BadRequestException);
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'addressDoc',
        originalname: 'temp.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('temp content'),
        stream: undefined as unknown as Readable,
        destination: '',
        filename: '',
        path: '',
      };

      const filePath = service.saveFile(mockFile);
      expect(fs.existsSync(filePath)).toBe(true);

      service.deleteFile(filePath);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should not throw when deleting a non-existent file', () => {
      expect(() =>
        service.deleteFile('./uploads/non-existent-file.pdf'),
      ).not.toThrow();
    });
  });
});
