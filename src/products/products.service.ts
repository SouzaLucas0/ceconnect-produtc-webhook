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
import { ProductSearchResultDto } from './dto/product-search-result.dto';

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
   * Busca, entre os produtos do cliente informado, a descrição mais parecida
   * com o termo. Retorna todos os produtos desse cliente com a mesma descrição
   * (ex.: pneus da Biz 125 de marcas diferentes), sem id, cliente e estoque.
   */
  async findBestMatch(
    descricao: string,
    cliente: string,
  ): Promise<ProductSearchResultDto[]> {
    this.logger.log(`Buscando "${descricao}" para o cliente "${cliente}"`);

    const rows = await this.repo.query(
      `WITH scored AS (
         SELECT descricao, valor, marca, referencia,
                GREATEST(
                  similarity(descricao, $1::text),
                  word_similarity($1::text, descricao)
                ) AS score
           FROM products
          WHERE lower(cliente) = lower($2::text)
       ),
       best AS (
         SELECT descricao, score
           FROM scored
          ORDER BY score DESC
          LIMIT 1
       )
       SELECT s.descricao, s.valor, s.marca, s.referencia, b.score
         FROM scored s
         JOIN best b ON s.descricao = b.descricao
        ORDER BY s.valor ASC`,
      [descricao, cliente],
    );

    if (!rows.length || Number(rows[0].score) < this.MIN_SCORE) {
      this.logger.warn(
        `Nenhum produto acima do limiar para "${descricao}" do cliente "${cliente}"`,
      );
      throw new NotFoundException('Nenhum produto semelhante encontrado para este cliente');
    }

    this.logger.log(
      `${rows.length} produto(s) encontrado(s) para "${descricao}" (score: ${Number(rows[0].score).toFixed(2)})`,
    );

    return rows.map((row) => ({
      descricao: row.descricao,
      valor: Number(row.valor),
      marca: row.marca,
      referencia: row.referencia,
    }));
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
