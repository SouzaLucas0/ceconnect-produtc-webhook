import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchProductQueryDto {
  @ApiProperty({ description: 'Senha de acesso', example: 'troque-por-uma-senha-forte' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Descrição (ou parte dela) do produto. Aceita nomes parecidos.',
    example: 'parafuso sextavado',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;
}
