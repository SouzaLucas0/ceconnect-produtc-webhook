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
import { normalizarMedida } from './medida';
import { montarConsultaBusca } from './busca';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  // Máximo de produtos devolvidos por busca
  private readonly LIMITE_RESULTADOS = 50;

  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // Habilita a extensão pg_trgm, cria a coluna de medida (em produção o
  // synchronize fica desligado) e preenche a medida dos produtos já cadastrados
  async onModuleInit() {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await this.dataSource.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS medida varchar(20)');
    await this.dataSource.query(
      'CREATE INDEX IF NOT EXISTS products_cliente_medida_idx ON products (cliente, medida)',
    );
    this.logger.log('Extensão pg_trgm e coluna medida verificadas');

    try {
      await this.preencherMedidas();
    } catch (error) {
      this.logger.error('Erro ao preencher a medida dos produtos', error.stack);
    }
  }

  // Preenche a medida dos produtos que ainda não têm, a partir da descrição
  private async preencherMedidas(): Promise<void> {
    const pendentes: { id: string; descricao: string }[] = await this.dataSource.query(
      'SELECT id, descricao FROM products WHERE medida IS NULL',
    );

    let preenchidos = 0;
    for (const produto of pendentes) {
      const medida = normalizarMedida(produto.descricao);
      if (!medida) continue;
      await this.dataSource.query('UPDATE products SET medida = $1 WHERE id = $2', [
        medida,
        produto.id,
      ]);
      preenchidos++;
    }

    if (preenchidos) {
      this.logger.log(`Medida preenchida em ${preenchidos} produto(s)`);
    }
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
      const items = dtos.map((dto) => ({
        ...dto,
        ativo: dto.ativo ?? true,
        medida: normalizarMedida(dto.descricao),
      }));
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

  // Produtos ativos com estoque > 0 de um cliente, ordenados por descrição
  async findAllByCliente(cliente: string): Promise<Product[]> {
    const products = await this.repo
      .createQueryBuilder('p')
      .where('lower(p.cliente) = lower(:cliente)', { cliente })
      .andWhere('p.ativo = true')
      .andWhere('p.estoque > 0')
      .orderBy('p.descricao', 'ASC')
      .getMany();
    this.logger.debug(`Listagem do cliente "${cliente}" retornou ${products.length} produto(s)`);
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
   * Busca os produtos do cliente cuja descrição contém todas as palavras do
   * termo (ex.: "pn tras biz") e, quando há, a mesma medida de pneu
   * (ex.: "17-90/90"). Palavras de ligação são ignoradas. Só entram produtos
   * ativos com estoque > 0. Retorna descrição, valor, marca e código, do menor
   * para o maior valor.
   */
  async findBestMatch(
    descricao: string,
    cliente: string,
  ): Promise<ProductSearchResultDto[]> {
    this.logger.log(`Buscando "${descricao}" para o cliente "${cliente}"`);

    const busca = montarConsultaBusca(descricao, cliente, this.LIMITE_RESULTADOS);
    if (!busca) {
      return [];
    }

    const rows = await this.repo.query(busca.sql, busca.params);

    if (!rows.length) {
      this.logger.warn(`Nenhum produto encontrado para "${descricao}" do cliente "${cliente}"`);
      return [];
    }

    this.logger.log(`${rows.length} produto(s) encontrado(s) para "${descricao}"`);

    return rows.map((row) => ({
      descricao: row.descricao,
      valor: Number(row.valor),
      marca: row.marca,
      codigo: row.codigo,
    }));
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    // A medida acompanha a descrição, que pode ter mudado
    product.medida = normalizarMedida(product.descricao);
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
