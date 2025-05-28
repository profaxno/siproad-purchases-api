import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DataReplicationService } from './data-replication.service';
import { DataReplicationAwsService } from './data-replication-aws.service';
import { DataReplicationRedisProducerService } from './data-replication-redis-producer.service';

@Module({
  imports: [ConfigModule],
  controllers: [],
  providers: [DataReplicationService, DataReplicationAwsService, DataReplicationRedisProducerService],
  exports: [DataReplicationService]
})
export class DataReplicationModule {}
