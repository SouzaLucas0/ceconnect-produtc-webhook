import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductQueryDto {
  @ApiProperty({ description: 'Senha de acesso', example: 'troque-por-uma-senha-forte' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description:
      'Cliente dono dos produtos. Se informado, é aplicado a todos os itens do body, ' +
      'dispensando o campo "cliente" em cada produto.',
    example: 'Moto Peças Central Ltda',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  cliente?: string;
}
