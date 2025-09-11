import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MessageDto } from '../dto/message.dto';
import { ProcessEnum, SourceEnum } from '../enums';

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

import { DataReplicationAwsService } from './data-replication-aws.service';
import { DataReplicationRedisProducerService } from './data-replication-redis-producer.service';
import { QueueTypeEnum } from '../enums/queue-type.enum';

@Injectable()
export class DataReplicationService {

  private readonly logger = new Logger(DataReplicationService.name);

  private readonly queueType: QueueTypeEnum;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataReplicationAwsService: DataReplicationAwsService,
    private readonly dataReplicationRedisProducerService: DataReplicationRedisProducerService
  ) {
    // this.queueType = this.configService.get('queueType') as QueueTypeEnum;
    this.queueType = this.configService.get('queueType') == 'AWS' ? QueueTypeEnum.AWS : QueueTypeEnum.REDIS;
  }
  
  async sendMessages(messageDtoList: MessageDto[]): Promise<ProcessSummaryDto> {
    this.logger.log(`sendMessages: process start...`);
    const start = performance.now();

    let processSummaryDto: ProcessSummaryDto = new ProcessSummaryDto(messageDtoList.length);

    if (processSummaryDto.totalRows === 0)
      return processSummaryDto; 

    // * process messages
    let rowProcessed = 0;
    for (const messageDto of messageDtoList) {
      
      await this.sendMessage(messageDto)
      .then( (result: string) => {
        processSummaryDto.rowsOK++;
        processSummaryDto.detailsRowsOK.push(`row=${rowProcessed}, response=${result}`);
      })
      .catch(err => {
        processSummaryDto.rowsKO++;
        processSummaryDto.detailsRowsKO.push(`row=${rowProcessed}, error=${err}`);
      })
      .finally( () => {
        rowProcessed++;
      })

    }

    const end = performance.now();
    this.logger.log(`sendMessages: executed, executionTime=${(end - start) / 1000} seconds, summary=${JSON.stringify(processSummaryDto)}`);
    return processSummaryDto;
  }

  sendMessage(messageDto: MessageDto): Promise<string> {
    this.logger.log(`sendMessage: queueType=${this.queueType}, messageDto=${JSON.stringify(messageDto)}`);

    switch (this.queueType) {

      case QueueTypeEnum.AWS:
        return this.dataReplicationAwsService.sendMessage(messageDto);

      case QueueTypeEnum.REDIS:
        return this.dataReplicationRedisProducerService.sendMessageToQueues(messageDto);

      default:
        throw new Error(`process not implement, process=${messageDto.process}`);

    }

  }

}
