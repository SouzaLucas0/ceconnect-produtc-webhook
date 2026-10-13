import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class Product {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Construtora Silva Ltda' })
  @Column({ length: 150 })
  cliente: string;

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
  @Column({ length: 100, nullable: true })
  marca: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'PS-10-INOX' })
  @Column({ length: 100, nullable: true })
  referencia: string | null;

  @ApiProperty({ example: 120 })
  @Column('int')
  estoque: number;
}
