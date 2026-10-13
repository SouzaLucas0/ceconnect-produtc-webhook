import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Formato devolvido pela busca: sem id, cliente e estoque
export class ProductSearchResultDto {
  @ApiProperty({ example: 'Pneu dianteiro 90/90-17 Biz 125' })
  descricao: string;

  @ApiProperty({ example: 189.9 })
  valor: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Pirelli' })
  marca: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SL-90-17' })
  referencia: string | null;
}
