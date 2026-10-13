import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { Product } from './entities/product.entity';
import { PasswordGuard } from '../common/guards/password.guard';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(PasswordGuard)
  @ApiHeader({ name: 'x-password', description: 'Senha de acesso', required: true })
  @ApiBody({ type: [CreateProductDto] })
  @ApiCreatedResponse({ type: [Product] })
  create(
    @Body(new ParseArrayPipe({ items: CreateProductDto }))
    products: CreateProductDto[],
  ) {
    return this.productsService.createMany(products);
  }

  @Get()
  @ApiOkResponse({ type: [Product] })
  findAll() {
    return this.productsService.findAll();
  }

  // Declarada antes de ':id' para não ser interpretada como um id
  @Get('search')
  @UseGuards(PasswordGuard)
  @ApiQuery({ name: 'password', required: true })
  @ApiQuery({ name: 'descricao', required: true, example: 'parafuso sextavado' })
  @ApiOkResponse({ type: Product })
  findByDescription(@Query() query: SearchProductQueryDto) {
    return this.productsService.findBestMatch(query.descricao);
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
