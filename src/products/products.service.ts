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
import { expandirAbreviacoes, normalizarSql } from './abreviacoes';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  // Pontuação mínima (0 a 1) para considerar um produto como correspondente
  private readonly MIN_SCORE = 0.3;
  // Similaridade mínima entre a descrição encontrada e as demais para agrupar
  // variações do mesmo produto (marca, separadores como "/" ou espaço, etc.)
  private readonly GROUP_MIN_SCORE = 0.6;

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

    // Um mesmo cliente + código não pode aparecer duas vezes no mesmo lote
    const keys = new Set<string>();
    for (const dto of dtos) {
      const key = `${dto.cliente}|${dto.codigo}`;
      if (keys.has(key)) {
        throw new BadRequestException(
          `Produto duplicado no lote: cliente "${dto.cliente}", código "${dto.codigo}"`,
        );
      }
      keys.add(key);
    }

    this.logger.log(`Cadastrando/atualizando ${dtos.length} produto(s)`);

    try {
      // Upsert: cria se não existir (cliente + código), senão atualiza
      const items = dtos.map((dto) => ({ ...dto, ativo: dto.ativo ?? true }));
      await this.repo.upsert(this.repo.create(items), ['cliente', 'codigo']);

      const saved = await this.repo.find({
        where: dtos.map((dto) => ({ cliente: dto.cliente, codigo: dto.codigo })),
      });
      this.logger.log(`${saved.length} produto(s) gravado(s) com sucesso`);
      return saved;
    } catch (error) {
      this.logger.error('Erro ao cadastrar produtos', error.stack);
      throw error;
    }
  }

  async findAll(): Promise<Product[]> {
    const products = await this.repo.find({
      where: { ativo: true },
      order: { descricao: 'ASC' },
    });
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
   * com o termo. Depois retorna todos os produtos desse cliente cuja descrição
   * é parecida com a melhor (ex.: "90/90-19" e "90 90 19", ou pneus da mesma
   * moto de marcas diferentes), sem id, cliente e estoque.
   */
  async findBestMatch(
    descricao: string,
    cliente: string,
  ): Promise<ProductSearchResultDto[]> {
    this.logger.log(`Buscando "${descricao}" para o cliente "${cliente}"`);

    // Abreviações (tras, diant, esq, dir) são expandidas dos dois lados
    const consulta = expandirAbreviacoes(descricao);
    const norm = normalizarSql('descricao');

    const rows = await this.repo.query(
      `WITH scored AS (
         SELECT descricao, valor, marca, referencia,
                GREATEST(
                  similarity(${norm}, $1::text),
                  word_similarity($1::text, ${norm})
                ) AS score
           FROM products
          WHERE lower(cliente) = lower($2::text)
            AND ativo = true
            AND estoque > 0
       ),
       best AS (
         SELECT descricao, score
           FROM scored
          ORDER BY score DESC
          LIMIT 1
       )
       SELECT s.descricao, s.valor, s.marca, s.referencia, b.score
         FROM scored s
         CROSS JOIN best b
        WHERE similarity(${normalizarSql('s.descricao')}, ${normalizarSql('b.descricao')}) >= $3::real
        ORDER BY s.valor ASC`,
      [consulta, cliente, this.GROUP_MIN_SCORE],
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
