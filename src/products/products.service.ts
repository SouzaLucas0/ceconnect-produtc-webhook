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

// Palavras que não ajudam a identificar um produto e são ignoradas na busca
const PALAVRAS_DE_LIGACAO = new Set([
  'a', 'o', 'as', 'os', 'e', 'de', 'da', 'do', 'das', 'dos',
  'em', 'na', 'no', 'nas', 'nos', 'para', 'pra', 'pro', 'com', 'um', 'uma',
]);

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
   * Busca os produtos do cliente cuja descrição contém todas as palavras do
   * termo (ex.: "pn tras biz"). Abreviações são expandidas nos dois lados e
   * palavras de ligação são ignoradas. Só entram produtos ativos com estoque > 0.
   * Retorna descrição, valor, marca e referência, do menor para o maior valor.
   */
  async findBestMatch(
    descricao: string,
    cliente: string,
  ): Promise<ProductSearchResultDto[]> {
    this.logger.log(`Buscando "${descricao}" para o cliente "${cliente}"`);

    // Abreviações (tras, diant, esq, dir) são expandidas dos dois lados.
    // Palavras de ligação (da, de, do...) são removidas da consulta, porque
    // normalmente não aparecem nas descrições cadastradas.
    const expandida = expandirAbreviacoes(descricao);
    const semLigacoes = expandida
      .split(/\s+/)
      .filter((palavra) => palavra && !PALAVRAS_DE_LIGACAO.has(palavra))
      .join(' ');
    const consulta = semLigacoes || expandida;
    const palavras = consulta.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!palavras.length) {
      return [];
    }

    // Uma condição por palavra: a descrição normalizada precisa conter todas
    const norm = normalizarSql('descricao');
    const params: unknown[] = [cliente];
    const condicoes = palavras.map((palavra) => {
      // Escapa os curingas do LIKE (% e _) digitados pelo cliente
      params.push(`%${palavra.replace(/[\\%_]/g, '\\$&')}%`);
      return `${norm} LIKE $${params.length}`;
    });

    const rows = await this.repo.query(
      `SELECT descricao, valor, marca, referencia
         FROM products
        WHERE lower(cliente) = lower($1::text)
          AND ativo = true
          AND estoque > 0
          AND ${condicoes.join('\n          AND ')}
        ORDER BY valor ASC
        LIMIT ${this.LIMITE_RESULTADOS}`,
      params,
    );

    if (!rows.length) {
      this.logger.warn(`Nenhum produto encontrado para "${descricao}" do cliente "${cliente}"`);
      return [];
    }

    this.logger.log(`${rows.length} produto(s) encontrado(s) para "${descricao}"`);

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
