import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchProductQueryDto {
  @ApiProperty({ description: 'Senha de acesso', example: 'troque-por-uma-senha-forte' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Cliente dono dos produtos', example: 'Moto Peças Central Ltda' })
  @IsString()
  @IsNotEmpty()
  cliente: string;

  @ApiProperty({
    description: 'Descrição (ou parte dela) do produto. Aceita nomes parecidos.',
    example: 'pneu biz 125',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;
}
