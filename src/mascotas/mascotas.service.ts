import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArchivosService } from '../archivos/archivos.service';
import { CrearMascotaDto } from './dto/crear-mascota.dto';
import { ActualizarMascotaDto } from './dto/actualizar-mascota.dto';
import { mapMascotaToResponse, mascotaInclude } from './mascotas.mapper';

function isPrismaErrorWithCode(error: unknown): error is { code: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

@Injectable()
export class MascotasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archivosService: ArchivosService,
  ) {}

  async create(
    propietarioId: string,
    dto: CrearMascotaDto,
    files: {
      foto?: Express.Multer.File;
      carnet?: Express.Multer.File;
    },
  ) {
    const savedPaths: string[] = [];

    const fotoPath = files.foto
      ? this.archivosService.saveFile(files.foto)
      : undefined;
    const carnetPath = files.carnet
      ? this.archivosService.saveFile(files.carnet)
      : undefined;

    if (fotoPath) savedPaths.push(fotoPath);
    if (carnetPath) savedPaths.push(carnetPath);

    try {
      return await this.prisma.$transaction(async (tx) => {
        let fotoPerfilId: string | undefined;
        let carnetVacunacionId: string | undefined;

        if (fotoPath && files.foto) {
          const foto = await tx.archivo.create({
            data: {
              url: fotoPath,
              nombreArchivo: files.foto.originalname,
              mime: files.foto.mimetype,
              tamano: files.foto.size,
            },
          });
          fotoPerfilId = foto.id;
        }

        if (carnetPath && files.carnet) {
          const carnet = await tx.archivo.create({
            data: {
              url: carnetPath,
              nombreArchivo: files.carnet.originalname,
              mime: files.carnet.mimetype,
              tamano: files.carnet.size,
            },
          });
          carnetVacunacionId = carnet.id;
        }

        const data: Prisma.MascotaUncheckedCreateInput = {
          propietarioId,
          nombre: dto.nombre,
          razaId: dto.razaId,
          colorId: dto.colorId,
          tipoPeloId: dto.tipoPeloId,
          patronPeloId: dto.patronPeloId,
          comportamientoId: dto.comportamientoId,
          fechaNacimiento: dto.fechaNacimiento
            ? new Date(dto.fechaNacimiento)
            : undefined,
          sexo: dto.sexo,
          peso: dto.peso,
          esterilizado: dto.esterilizado,
          ruac: dto.ruac,
          microchip: dto.microchip,
          tatuaje: dto.tatuaje,
          observaciones: dto.observaciones,
          fotoPerfilId,
          carnetVacunacionId,
        };

        if (dto.alergiaIds && dto.alergiaIds.length > 0) {
          data.alergias = {
            create: dto.alergiaIds.map((alergiaId) => ({ alergiaId })),
          };
        }

        const mascota = await tx.mascota.create({
          data,
          include: mascotaInclude,
        });
        return mapMascotaToResponse(mascota);
      });
    } catch (error) {
      for (const path of savedPaths) {
        this.archivosService.deleteFile(path);
      }

      if (isPrismaErrorWithCode(error) && error.code === 'P2003') {
        throw new BadRequestException(
          'Referencia inválida en los datos proporcionados',
        );
      }

      throw error;
    }
  }

  async findAllByOwner(propietarioId: string) {
    const mascotas = await this.prisma.mascota.findMany({
      where: { propietarioId },
      include: mascotaInclude,
    });
    return mascotas.map(mapMascotaToResponse);
  }

  async findOne(id: string, propietarioId: string) {
    const mascota = await this.prisma.mascota.findFirst({
      where: { id, propietarioId },
      include: mascotaInclude,
    });

    if (!mascota) {
      throw new NotFoundException('Mascota no encontrada');
    }

    return mapMascotaToResponse(mascota);
  }

  async update(
    id: string,
    propietarioId: string,
    dto: ActualizarMascotaDto,
    files: {
      foto?: Express.Multer.File;
      carnet?: Express.Multer.File;
    },
  ) {
    const currentPet = await this.prisma.mascota.findFirst({
      where: { id, propietarioId },
      include: { fotoPerfil: true, carnetVacunacion: true },
    });

    if (!currentPet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    const oldFotoUrl = currentPet.fotoPerfil?.url;
    const oldCarnetUrl = currentPet.carnetVacunacion?.url;
    const oldFotoId = currentPet.fotoPerfilId;
    const oldCarnetId = currentPet.carnetVacunacionId;

    const newSavedPaths: string[] = [];

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const data: Prisma.MascotaUncheckedUpdateInput = {};

        if (dto.nombre !== undefined) data.nombre = dto.nombre;
        if (dto.razaId !== undefined) data.razaId = dto.razaId;
        if (dto.colorId !== undefined) data.colorId = dto.colorId;
        if (dto.tipoPeloId !== undefined) data.tipoPeloId = dto.tipoPeloId;
        if (dto.patronPeloId !== undefined)
          data.patronPeloId = dto.patronPeloId;
        if (dto.comportamientoId !== undefined)
          data.comportamientoId = dto.comportamientoId;
        if (dto.fechaNacimiento !== undefined)
          data.fechaNacimiento = new Date(dto.fechaNacimiento);
        if (dto.sexo !== undefined) data.sexo = dto.sexo;
        if (dto.peso !== undefined) data.peso = dto.peso;
        if (dto.esterilizado !== undefined)
          data.esterilizado = dto.esterilizado;
        if (dto.ruac !== undefined) data.ruac = dto.ruac;
        if (dto.microchip !== undefined) data.microchip = dto.microchip;
        if (dto.tatuaje !== undefined) data.tatuaje = dto.tatuaje;
        if (dto.observaciones !== undefined)
          data.observaciones = dto.observaciones;

        if (files.foto) {
          const fotoPath = this.archivosService.saveFile(files.foto);
          newSavedPaths.push(fotoPath);
          const foto = await tx.archivo.create({
            data: {
              url: fotoPath,
              nombreArchivo: files.foto.originalname,
              mime: files.foto.mimetype,
              tamano: files.foto.size,
            },
          });
          data.fotoPerfilId = foto.id;
        }

        if (files.carnet) {
          const carnetPath = this.archivosService.saveFile(files.carnet);
          newSavedPaths.push(carnetPath);
          const carnet = await tx.archivo.create({
            data: {
              url: carnetPath,
              nombreArchivo: files.carnet.originalname,
              mime: files.carnet.mimetype,
              tamano: files.carnet.size,
            },
          });
          data.carnetVacunacionId = carnet.id;
        }

        if (dto.alergiaIds !== undefined) {
          await tx.mascotaAlergia.deleteMany({
            where: { mascotaId: id },
          });
          if (dto.alergiaIds.length > 0) {
            await tx.mascotaAlergia.createMany({
              data: dto.alergiaIds.map((alergiaId) => ({
                mascotaId: id,
                alergiaId,
              })),
            });
          }
        }

        const mascota = await tx.mascota.update({
          where: { id },
          data,
          include: mascotaInclude,
        });
        return mapMascotaToResponse(mascota);
      });

      if (oldFotoUrl) this.archivosService.deleteFile(oldFotoUrl);
      if (oldCarnetUrl) this.archivosService.deleteFile(oldCarnetUrl);
      if (oldFotoId) {
        await this.prisma.archivo
          .delete({ where: { id: oldFotoId } })
          .catch(() => {});
      }
      if (oldCarnetId) {
        await this.prisma.archivo
          .delete({ where: { id: oldCarnetId } })
          .catch(() => {});
      }

      return result;
    } catch (error) {
      for (const path of newSavedPaths) {
        this.archivosService.deleteFile(path);
      }
      throw error;
    }
  }
}
