import { ApiProperty } from '@nestjs/swagger';

export class VerifyQueryDto {
  @ApiProperty({ description: 'Verification token' })
  token!: string;
}
