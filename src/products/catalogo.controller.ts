import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { QueryPasswordGuard } from '../common/guards/query-password.guard';
import { SearchProductQueryDto } from './dto/search-product.query.dto';
import { ProductsService } from './products.service';

// Texto seguro para célula de tabela Markdown: sem quebra de linha e sem "|"
const celula = (valor: unknown): string =>
  String(valor ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();

const formatarValor = (valor: number): string =>
  `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;

// Catálogo em Markdown com os produtos do cliente. Senha e cliente na URL:
// /catalogo?cliente=Aguiar&password=SENHA
@Controller()
export class CatalogoController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('catalogo')
  @UseGuards(QueryPasswordGuard)
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @ApiExcludeEndpoint()
  async catalogo(@Query() query: SearchProductQueryDto): Promise<string> {
    const produtos = await this.productsService.findAllByCliente(query.cliente);
    const cliente = celula(query.cliente);

    const cabecalho = [
      '# Catálogo de produtos',
      '',
      `${cliente} · ${produtos.length} produto(s)`,
      '',
    ];

    if (!produtos.length) {
      return [...cabecalho, '_Nenhum produto disponível para este cliente._', ''].join('\n');
    }

    const tabela = [
      '| Descrição | Marca | Código | Valor |',
      '| --- | --- | --- | ---: |',
      ...produtos.map(
        (p) =>
          `| ${celula(p.descricao)} | ${celula(p.marca)} | ${celula(p.codigo)} | ${formatarValor(p.valor)} |`,
      ),
      '',
    ];

    return [...cabecalho, ...tabela].join('\n');
  }
}
