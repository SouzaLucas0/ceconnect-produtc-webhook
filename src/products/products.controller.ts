import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductQueryDto } from './dto/search-product.query.dto';
import { SearchProductBodyDto } from './dto/search-product.body.dto';
import { ProductSearchResultDto } from './dto/product-search-result.dto';
import { Product } from './entities/product.entity';
import { PasswordGuard } from '../common/guards/password.guard';
import { AgentSecretGuard } from '../common/guards/agent-secret.guard';
import { QueryPasswordGuard } from '../common/guards/query-password.guard';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  // Log de depuração: mostra o que chegou na requisição.
  // Por padrão, senhas saem mascaradas. Para ver os valores reais, defina
  // DEBUG_LOG_SECRETS=true no ambiente (e remova depois do teste).
  private logRequest(rota: string, req: Request, body: unknown) {
    const showSecrets = process.env.DEBUG_LOG_SECRETS === 'true';
    const mask = (value: unknown) => (showSecrets ? value : '***');

    const headers = { ...req.headers } as Record<string, unknown>;
    for (const campo of ['x-password', 'x-zpro-agent-secret', 'authorization']) {
      if (headers[campo]) headers[campo] = mask(headers[campo]);
    }

    const query = { ...req.query } as Record<string, unknown>;
    if (query.password) query.password = mask(query.password);

    this.logger.log(
      `${rota} recebido\n` +
        `ip: ${req.ip}\n` +
        `url: ${req.originalUrl}\n` +
        `query: ${JSON.stringify(query, null, 2)}\n` +
        `headers: ${JSON.stringify(headers, null, 2)}\n` +
        `body: ${JSON.stringify(body, null, 2)}`,
    );
  }

  // Cadastra um array de produtos
  @Post('add')
  @UseGuards(PasswordGuard)
  @ApiHeader({ name: 'x-password', description: 'Senha de acesso', required: true })
  @ApiBody({ type: [CreateProductDto] })
  @ApiCreatedResponse({ type: [Product] })
  add(
    @Body(new ParseArrayPipe({ items: CreateProductDto }))
    products: CreateProductDto[],
  ) {
    return this.productsService.createMany(products);
  }

  // Lista os produtos com estoque do cliente. Senha e cliente na URL
  @Post()
  @UseGuards(QueryPasswordGuard)
  @ApiQuery({ name: 'password', required: true, description: 'Senha de acesso' })
  @ApiQuery({ name: 'cliente', required: true, example: 'Moto Peças Central Ltda' })
  @ApiOkResponse({ type: [Product] })
  list(@Req() req: Request, @Query() query: SearchProductQueryDto) {
    this.logRequest('POST /products', req, undefined);
    return this.productsService.findAllByCliente(query.cliente);
  }

  @Get()
  @ApiOkResponse({ type: [Product] })
  findAll() {
    return this.productsService.findAll();
  }

  // Busca por semelhança. Senha no header x-zpro-agent-secret; cliente na URL;
  // termo da busca em body.args.consulta
  @Post('search')
  @UseGuards(AgentSecretGuard)
  @ApiHeader({ name: 'x-zpro-agent-secret', description: 'Senha de acesso', required: true })
  @ApiQuery({ name: 'cliente', required: true, example: 'Moto Peças Central Ltda' })
  @ApiBody({ type: SearchProductBodyDto })
  @ApiOkResponse({
    type: [ProductSearchResultDto],
    description: 'Lista de produtos encontrados. Lista vazia quando nenhum produto corresponde à busca.',
  })
  search(
    @Req() req: Request,
    @Query() query: SearchProductQueryDto,
    @Body() body: SearchProductBodyDto,
  ) {
    this.logRequest('POST /products/search', req, body);
    return this.productsService.findBestMatch(body.args.consulta, query.cliente);
  }

  @Get(':id')
  @ApiOkResponse({ type: Product })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PasswordGuard)
  @ApiHeader({ name: 'x-password', required: true })
  @ApiOkResponse({ type: Product })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PasswordGuard)
  @ApiHeader({ name: 'x-password', required: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
