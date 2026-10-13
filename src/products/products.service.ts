import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  // Pontuação mínima (0 a 1) para considerar um produto como correspondente
  private readonly MIN_SCORE = 0.3;

  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // Habilita a extensão pg_trgm, usada na busca por semelhança
  async onModuleInit() {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    this.logger.log('Extensão pg_trgm verificada/habilitada');
  }

  async createMany(dtos: CreateProductDto[]): Promise<Product[]> {
    if (!dtos.length) {
      this.logger.warn('Tentativa de cadastro com lista vazia');
      throw new BadRequestException('Envie ao menos um produto');
    }

    this.logger.log(`Cadastrando ${dtos.length} produto(s)`);

    try {
      // save com array roda em uma única transação
      const saved = await this.repo.save(this.repo.create(dtos));
      this.logger.log(`${saved.length} produto(s) cadastrado(s) com sucesso`);
      return saved;
    } catch (error) {
      this.logger.error('Erro ao cadastrar produtos', error.stack);
      throw error;
    }
  }

  async findAll(): Promise<Product[]> {
    const products = await this.repo.find({ order: { descricao: 'ASC' } });
    this.logger.debug(`Listagem retornou ${products.length} produto(s)`);
    return products;
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOneBy({ id });
    if (!product) {
      this.logger.warn(`Produto ${id} não encontrado`);
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }
    return product;
  }

  /**
   * Retorna o produto cuja descrição é mais parecida com o termo informado.
   * Usa similarity (nome inteiro) e word_similarity (parte do nome).
   */
  async findBestMatch(descricao: string): Promise<Product> {
    this.logger.log(`Buscando produto semelhante a "${descricao}"`);

    const [best] = await this.repo.query(
      `SELECT id,
              GREATEST(
                similarity(descricao, $1::text),
                word_similarity($1::text, descricao)
              ) AS score
         FROM products
        ORDER BY score DESC
        LIMIT 1`,
      [descricao],
    );

    if (!best || Number(best.score) < this.MIN_SCORE) {
      this.logger.warn(
        `Nenhum produto acima do limiar para "${descricao}" (score: ${best?.score ?? 'n/a'})`,
      );
      throw new NotFoundException('Nenhum produto semelhante encontrado');
    }

    this.logger.log(
      `Melhor correspondência para "${descricao}": ${best.id} (score: ${Number(best.score).toFixed(2)})`,
    );
    return this.findOne(best.id);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    const updated = await this.repo.save(product);
    this.logger.log(`Produto ${id} atualizado`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.repo.remove(product);
    this.logger.log(`Produto ${id} removido`);
  }
}
