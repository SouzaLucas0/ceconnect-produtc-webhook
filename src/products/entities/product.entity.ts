import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Um produto é único por cliente + código (código do sistema do cliente)
@Entity('products')
@Unique(['cliente', 'codigo'])
export class Product {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Construtora Silva Ltda' })
  @Column({ length: 150 })
  cliente: string;

  @ApiProperty({ example: '000123', description: 'Código do produto no sistema do cliente' })
  @Column({ length: 50 })
  codigo: string;

  @ApiProperty({ example: 'Parafuso sextavado 10mm inox' })
  @Column({ length: 255 })
  descricao: string;

  @ApiProperty({ example: 19.9 })
  @Column('decimal', {
    precision: 12,
    scale: 2,
    // o Postgres devolve decimal como string; converte para number
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  valor: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Tramontina' })
  @Column('varchar', { length: 100, nullable: true })
  marca: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'PS-10-INOX' })
  @Column('varchar', { length: 100, nullable: true })
  referencia: string | null;

  @ApiProperty({ example: 2.5, description: 'Aceita fração' })
  @Column('decimal', {
    precision: 12,
    scale: 3,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  estoque: number;

  // Produtos inativos não aparecem na listagem nem na busca
  @ApiProperty({ example: true })
  @Column({ default: true })
  ativo: boolean;
}
