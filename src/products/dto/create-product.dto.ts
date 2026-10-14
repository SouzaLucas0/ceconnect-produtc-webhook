import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Construtora Silva Ltda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  cliente: string;

  @ApiProperty({ example: '000123', description: 'Código do produto no sistema do cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @ApiProperty({ example: 'Parafuso sextavado 10mm inox' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descricao: string;

  @ApiProperty({ example: 19.9 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Tramontina' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'PS-10-INOX' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string | null;

  @ApiProperty({ example: 2.5, description: 'Aceita fração (até 3 casas)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  estoque: number;

  @ApiPropertyOptional({ example: true, default: true, description: 'Padrão: true' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
