import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from './companies/entities/company.entity';
import { CompanyController } from './companies/company.controller';
import { CompanyService } from './companies/company.service';

import { User } from './users/entities/user.entity';
import { UserController } from './users/user.controller';
import { UserService } from './users/user.service';

import { PurchaseOrder, PurchaseOrderProduct, PurchaseType, PurchaseSequence, DocumentType } from './orders/entities';
import { PurchaseOrderController } from './orders/purchase-order.controller';
import { PurchaseOrderService } from './orders/purchase-order.service';
import { DocumentTypeService } from './documentTypes/document-type.service';

import { Product, ProductCategory } from './products/entities';
import { ProductController } from './products/product.controller';
import { ProductCategoryController } from './products/product-category.controller';
import { ProductService } from './products/product.service';
import { ProductCategoryService } from './products/product-category.service';

import { DataReplicationModule } from 'src/data-transfer/data-replication/data-replication.module';
import { PurchaseTypeController } from './orders/purchase-type.controller';
import { PurchaseTypeService } from './orders/purchase-type.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, User, DocumentType, PurchaseOrder, PurchaseOrderProduct, PurchaseType, PurchaseSequence, Product, ProductCategory], 'purchasesConn'),
    DataReplicationModule
  ],
  controllers: [CompanyController, UserController, PurchaseOrderController, PurchaseTypeController, ProductController, ProductCategoryController],
  providers: [CompanyService, UserService, DocumentTypeService, PurchaseOrderService, PurchaseTypeService, ProductService, ProductCategoryService],
  exports: [CompanyService, UserService, DocumentTypeService, ProductService, ProductCategoryService]
})
export class PurchasesModule {}
