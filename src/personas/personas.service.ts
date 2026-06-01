import { Injectable } from '@nestjs/common';
import { Prisma, Persona } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PersonaCreateInput): Promise<Persona> {
    return this.prisma.persona.create({ data });
  }
}
