import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

import { UserController } from './user.controller';
import { UserService } from './user.service';

import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

import { ProductCategoryController } from './product-category.controller';
import { ProductCategoryService } from './product-category.service';

import { Company, User, PurchaseOrder, PurchaseOrderProduct, Product, ProductCategory } from './entities';
import { DataReplicationModule } from 'src/data-transfer/data-replication/data-replication.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, User, PurchaseOrder, PurchaseOrderProduct, Product, ProductCategory], 'purchasesConn'),
    DataReplicationModule
  ],
  controllers: [CompanyController, UserController, PurchaseOrderController, ProductController, ProductCategoryController],
  providers: [CompanyService, UserService, PurchaseOrderService, ProductService, ProductCategoryService],
  exports: [CompanyService, UserService, ProductService, ProductCategoryService]
})
export class PurchasesModule {}
