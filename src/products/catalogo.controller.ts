import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { QueryPasswordGuard } from '../common/guards/query-password.guard';
import { SearchProductQueryDto } from './dto/search-product.query.dto';
import { ProductsService } from './products.service';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Evita que textos do cadastro sejam interpretados como HTML
const escapar = (valor: unknown): string =>
  String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

const formatarValor = (valor: number): string =>
  `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;

// Página HTML com os produtos do cliente. Senha e cliente na URL:
// /catalogo?cliente=Aguiar&password=SENHA
@Controller()
export class CatalogoController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('catalogo')
  @UseGuards(QueryPasswordGuard)
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiExcludeEndpoint()
  async catalogo(@Query() query: SearchProductQueryDto): Promise<string> {
    const produtos = await this.productsService.findAllByCliente(query.cliente);
    const cliente = escapar(query.cliente);

    const linhas = produtos
      .map(
        (p) => `
          <tr>
            <td>${escapar(p.descricao)}</td>
            <td>${escapar(p.marca)}</td>
            <td>${escapar(p.codigo)}</td>
            <td class="valor">${formatarValor(p.valor)}</td>
          </tr>`,
      )
      .join('');

    const conteudo = produtos.length
      ? `<table>
          <thead>
            <tr><th>Descrição</th><th>Marca</th><th>Código</th><th class="valor">Valor</th></tr>
          </thead>
          <tbody>${linhas}
          </tbody>
        </table>`
      : '<p class="vazio">Nenhum produto disponível para este cliente.</p>';

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Catálogo - ${cliente}</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: Canvas; color: CanvasText; }
    main { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.4rem; margin: 0 0 4px; }
    .resumo { margin: 0 0 16px; opacity: 0.7; font-size: 0.9rem; }
    .tabela { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(127,127,127,0.25); }
    th { font-weight: 600; }
    .valor { text-align: right; white-space: nowrap; }
    .vazio { padding: 24px 0; opacity: 0.7; }
  </style>
</head>
<body>
  <main>
    <h1>Catálogo de produtos</h1>
    <p class="resumo">${cliente} · ${produtos.length} produto(s)</p>
    <div class="tabela">${conteudo}</div>
  </main>
</body>
</html>`;
  }
}
