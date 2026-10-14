import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchProductQueryDto {
  @ApiProperty({ description: 'Cliente dono dos produtos', example: 'Moto Peças Central Ltda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  cliente: string;
}
