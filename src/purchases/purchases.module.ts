import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from './companies/entities/company.entity';
import { CompanyService } from './companies/company.service';

import { User } from './users/entities/user.entity';
import { UserService } from './users/user.service';

import { PurchaseOrder, PurchaseOrderProduct, PurchaseType, Sequence } from './orders/entities';
import { PurchaseOrderController } from './orders/purchase-order.controller';
import { PurchaseOrderService } from './orders/purchase-order.service';

import { DataReplicationModule } from 'src/data-transfer/data-replication/data-replication.module';
import { PurchaseTypeController } from './orders/purchase-type.controller';
import { PurchaseTypeService } from './orders/purchase-type.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Company, User, PurchaseOrder, PurchaseOrderProduct, PurchaseType, Sequence], 'purchasesConn'),
    DataReplicationModule
  ],
  controllers: [PurchaseOrderController, PurchaseTypeController],
  providers: [CompanyService, UserService, PurchaseOrderService, PurchaseTypeService],
  exports: [CompanyService, UserService]
})
export class PurchasesModule {}
