/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MascotasService } from './mascotas.service';
import { PrismaService } from '../prisma/prisma.service';
import { ArchivosService } from '../archivos/archivos.service';

const mockPrismaService = {
  $transaction: jest.fn(),
  mascota: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    update: jest.fn(),
  },
  mascotaAlergia: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  archivo: {
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const mockArchivosService = {
  saveFile: jest.fn(),
  deleteFile: jest.fn(),
};

describe('MascotasService', () => {
  let service: MascotasService;

  const propietarioId = '00000000-0000-4000-8000-000000000001';
  const mascotaId = '00000000-0000-4000-8000-000000000002';
  const razaId = '00000000-0000-4000-8000-000000000003';
  const alergiaId = '00000000-0000-4000-8000-000000000004';

  const mockFile: Express.Multer.File = {
    fieldname: 'foto',
    originalname: 'foto.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('jpg'),
    stream: undefined as unknown as Readable,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MascotasService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ArchivosService, useValue: mockArchivosService },
      ],
    }).compile();

    service = module.get<MascotasService>(MascotasService);
    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation((callback: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return callback(mockPrismaService);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      nombre: 'Firulais',
      razaId,
      alergiaIds: [alergiaId],
    };

    it('should create pet with files and allergies', async () => {
      mockArchivosService.saveFile
        .mockReturnValueOnce('./uploads/foto-uuid.jpg')
        .mockReturnValueOnce('./uploads/carnet-uuid.pdf');

      mockPrismaService.archivo.create
        .mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000010' })
        .mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000011' });

      mockPrismaService.mascota.create.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais',
      });

      const result = await service.create(propietarioId, dto, {
        foto: mockFile,
        carnet: {
          ...mockFile,
          fieldname: 'carnet',
          originalname: 'carnet.pdf',
          mimetype: 'application/pdf',
        },
      });

      expect(mockArchivosService.saveFile).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.archivo.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.mascota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            propietarioId,
            nombre: 'Firulais',
            razaId,
            fotoPerfilId: '00000000-0000-4000-8000-000000000010',
            carnetVacunacionId: '00000000-0000-4000-8000-000000000011',
            alergias: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  alergiaId,
                }),
              ]),
            },
          }),
        }),
      );
      expect(result).toEqual({ id: mascotaId, nombre: 'Firulais' });
    });

    it('should create pet without files', async () => {
      mockPrismaService.mascota.create.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais',
      });

      const result = await service.create(propietarioId, dto, {});

      expect(mockArchivosService.saveFile).not.toHaveBeenCalled();
      expect(mockPrismaService.archivo.create).not.toHaveBeenCalled();
      expect(mockPrismaService.mascota.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            propietarioId,
            nombre: 'Firulais',
            fotoPerfilId: undefined,
            carnetVacunacionId: undefined,
          }),
        }),
      );
      expect(result).toEqual({ id: mascotaId, nombre: 'Firulais' });
    });

    it('should delete saved files on transaction failure', async () => {
      mockArchivosService.saveFile
        .mockReturnValueOnce('./uploads/foto-uuid.jpg')
        .mockReturnValueOnce('./uploads/carnet-uuid.pdf');

      mockPrismaService.$transaction.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create(propietarioId, dto, {
          foto: mockFile,
          carnet: {
            ...mockFile,
            fieldname: 'carnet',
            originalname: 'carnet.pdf',
            mimetype: 'application/pdf',
          },
        }),
      ).rejects.toThrow('DB error');

      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/foto-uuid.jpg',
      );
      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/carnet-uuid.pdf',
      );
    });

    it('should throw BadRequestException on P2003 foreign key error', async () => {
      mockArchivosService.saveFile.mockReturnValue('./uploads/foto-uuid.jpg');

      const prismaError = new Error('FK failed') as Error & { code: string };
      prismaError.code = 'P2003';
      mockPrismaService.$transaction.mockRejectedValue(prismaError);

      await expect(
        service.create(propietarioId, dto, { foto: mockFile }),
      ).rejects.toThrow(BadRequestException);

      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/foto-uuid.jpg',
      );
    });
  });

  describe('findAllByOwner', () => {
    it('should return pets scoped to caller', async () => {
      const pets = [{ id: mascotaId, nombre: 'Firulais' }];
      mockPrismaService.mascota.findMany.mockResolvedValue(pets);

      const result = await service.findAllByOwner(propietarioId);

      expect(mockPrismaService.mascota.findMany).toHaveBeenCalledWith({
        where: { propietarioId },
        include: { alergias: true },
      });
      expect(result).toEqual(pets);
    });
  });

  describe('findOne', () => {
    it('should return pet for owner', async () => {
      const pet = { id: mascotaId, nombre: 'Firulais' };
      mockPrismaService.mascota.findFirst.mockResolvedValue(pet);

      const result = await service.findOne(mascotaId, propietarioId);

      expect(mockPrismaService.mascota.findFirst).toHaveBeenCalledWith({
        where: { id: mascotaId, propietarioId },
        include: { alergias: true },
      });
      expect(result).toEqual(pet);
    });

    it('should throw NotFoundException for cross-owner access', async () => {
      mockPrismaService.mascota.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mascotaId, propietarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      nombre: 'Firulais II',
      alergiaIds: [alergiaId],
    };

    it('should throw NotFoundException when pet not found or owned by another user', async () => {
      mockPrismaService.mascota.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mascotaId, propietarioId, { nombre: 'X' }, {}),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.mascota.findFirst).toHaveBeenCalledWith({
        where: { id: mascotaId, propietarioId },
        include: { fotoPerfil: true, carnetVacunacion: true },
      });
    });

    it('should replace allergies when alergiaIds provided', async () => {
      mockPrismaService.mascota.findFirst.mockResolvedValue({
        id: mascotaId,
        propietarioId,
        fotoPerfilId: null,
        carnetVacunacionId: null,
        fotoPerfil: null,
        carnetVacunacion: null,
      });
      mockPrismaService.mascotaAlergia.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.mascotaAlergia.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.mascota.update.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais II',
      });

      const result = await service.update(
        mascotaId,
        propietarioId,
        updateDto,
        {},
      );

      expect(mockPrismaService.mascota.findFirst).toHaveBeenCalledWith({
        where: { id: mascotaId, propietarioId },
        include: { fotoPerfil: true, carnetVacunacion: true },
      });
      expect(mockPrismaService.mascotaAlergia.deleteMany).toHaveBeenCalledWith({
        where: { mascotaId },
      });
      expect(mockPrismaService.mascotaAlergia.createMany).toHaveBeenCalledWith({
        data: [{ mascotaId, alergiaId }],
      });
      expect(mockPrismaService.mascota.update).toHaveBeenCalledWith({
        where: { id: mascotaId },
        data: expect.objectContaining({ nombre: 'Firulais II' }),
        include: { alergias: true },
      });
      expect(result).toEqual({ id: mascotaId, nombre: 'Firulais II' });
    });

    it('should update pet without touching allergies when alergiaIds undefined', async () => {
      mockPrismaService.mascota.findFirst.mockResolvedValue({
        id: mascotaId,
        propietarioId,
        fotoPerfilId: null,
        carnetVacunacionId: null,
        fotoPerfil: null,
        carnetVacunacion: null,
      });
      mockPrismaService.mascota.update.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais II',
      });

      const result = await service.update(
        mascotaId,
        propietarioId,
        { nombre: 'Firulais II' },
        {},
      );

      expect(
        mockPrismaService.mascotaAlergia.deleteMany,
      ).not.toHaveBeenCalled();
      expect(
        mockPrismaService.mascotaAlergia.createMany,
      ).not.toHaveBeenCalled();
      expect(result).toEqual({ id: mascotaId, nombre: 'Firulais II' });
    });

    it('should delete old files and archivo records after successful update with new files', async () => {
      mockPrismaService.mascota.findFirst.mockResolvedValue({
        id: mascotaId,
        propietarioId,
        fotoPerfilId: '00000000-0000-4000-8000-000000000020',
        carnetVacunacionId: '00000000-0000-4000-8000-000000000021',
        fotoPerfil: {
          id: '00000000-0000-4000-8000-000000000020',
          url: './uploads/old-foto.jpg',
        },
        carnetVacunacion: {
          id: '00000000-0000-4000-8000-000000000021',
          url: './uploads/old-carnet.pdf',
        },
      });

      mockArchivosService.saveFile
        .mockReturnValueOnce('./uploads/new-foto.jpg')
        .mockReturnValueOnce('./uploads/new-carnet.pdf');

      mockPrismaService.archivo.create
        .mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000030' })
        .mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000031' });

      mockPrismaService.mascota.update.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais II',
      });

      mockPrismaService.archivo.delete = jest.fn().mockResolvedValue({});

      const result = await service.update(
        mascotaId,
        propietarioId,
        { nombre: 'Firulais II' },
        {
          foto: mockFile,
          carnet: {
            ...mockFile,
            fieldname: 'carnet',
            originalname: 'carnet.pdf',
            mimetype: 'application/pdf',
          },
        },
      );

      expect(mockArchivosService.saveFile).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.archivo.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.mascota.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fotoPerfilId: '00000000-0000-4000-8000-000000000030',
            carnetVacunacionId: '00000000-0000-4000-8000-000000000031',
          }),
        }),
      );

      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/old-foto.jpg',
      );
      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/old-carnet.pdf',
      );
      expect(mockPrismaService.archivo.delete).toHaveBeenCalledWith({
        where: { id: '00000000-0000-4000-8000-000000000020' },
      });
      expect(mockPrismaService.archivo.delete).toHaveBeenCalledWith({
        where: { id: '00000000-0000-4000-8000-000000000021' },
      });

      expect(result).toEqual({ id: mascotaId, nombre: 'Firulais II' });
    });

    it('should rollback new files when transaction fails during update', async () => {
      mockPrismaService.mascota.findFirst.mockResolvedValue({
        id: mascotaId,
        propietarioId,
        fotoPerfilId: null,
        carnetVacunacionId: null,
        fotoPerfil: null,
        carnetVacunacion: null,
      });

      mockArchivosService.saveFile.mockReturnValue('./uploads/new-foto.jpg');
      mockPrismaService.archivo.create.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000040',
      });
      mockPrismaService.mascota.update.mockRejectedValue(new Error('DB error'));

      await expect(
        service.update(
          mascotaId,
          propietarioId,
          { nombre: 'X' },
          { foto: mockFile },
        ),
      ).rejects.toThrow('DB error');

      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/new-foto.jpg',
      );
    });
  });
});
