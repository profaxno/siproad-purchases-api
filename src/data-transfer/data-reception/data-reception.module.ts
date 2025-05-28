import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DataReceptionService } from './data-reception.service';
import { DataReceptionWorkerService } from './data-reception-redis-worker.service';
import { PurchasesModule } from 'src/purchases/purchases.module';

@Module({
  controllers: [],
  providers: [DataReceptionService, DataReceptionWorkerService],
  imports: [ConfigModule, PurchasesModule]
})
export class DataReceptionModule {}
