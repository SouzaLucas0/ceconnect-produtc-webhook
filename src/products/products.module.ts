import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { CatalogoController } from './catalogo.controller';
import { QueryPasswordGuard } from '../common/guards/query-password.guard';
import { ProductsService } from './products.service';
import { PasswordGuard } from '../common/guards/password.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController, CatalogoController],
  providers: [ProductsService, PasswordGuard, QueryPasswordGuard],
})
export class ProductsModule {}
