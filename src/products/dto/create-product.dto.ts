import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
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

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(0)
  estoque: number;
}
