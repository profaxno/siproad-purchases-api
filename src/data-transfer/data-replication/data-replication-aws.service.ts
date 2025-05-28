import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MessageDto } from '../dto/message.dto';
import { ProcessEnum, SourceEnum } from '../enums';

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

@Injectable()
export class DataReplicationAwsService {

  private readonly logger = new Logger(DataReplicationAwsService.name);
  
  private readonly useLocalStack: boolean = false;
  private readonly awsHost: string = "";
  private readonly awsRegion: string = "";
  private readonly awsAccessKeyId: string = "";
  private readonly awsSecretAccessKey: string = "";
  private readonly adminSnsTopicArn: string = "";
  private readonly productsSnsTopicArn: string = "";

  private readonly snsClient: SNSClient;  
  private readonly sqsClient: SQSClient;

  constructor(
    private readonly configService: ConfigService
  ) {
    this.useLocalStack        = this.configService.get('useLocalStack') == 1 ? true : false;
    this.awsHost              = this.configService.get('awsHost');
    this.awsRegion            = this.configService.get('awsRegion');
    this.awsAccessKeyId       = this.configService.get('awsAccessKeyId');
    this.awsSecretAccessKey   = this.configService.get('awsSecretAccessKey');
    this.productsSnsTopicArn  = this.configService.get('productsSnsTopicArn');

    // * configure SNS client
    const snsConfig = { 
      region: this.awsRegion,
      credentials: {
        accessKeyId: this.awsAccessKeyId,
        secretAccessKey: this.awsSecretAccessKey,
      },
    }

    if(this.useLocalStack)
      snsConfig['endpoint'] = this.awsHost;

    this.snsClient = new SNSClient(snsConfig);

    // * configure SQS client
    this.sqsClient = new SQSClient({ region: this.awsRegion});
  }
  
  sendMessage(messageDto: MessageDto): Promise<string> {
    
    // if(
    //   messageDto.process == ProcessEnum.PRODUCT_TYPE_UPDATE ||
    //   messageDto.process == ProcessEnum.PRODUCT_TYPE_DELETE ||
    //   messageDto.process == ProcessEnum.PRODUCT_UPDATE ||
    //   messageDto.process == ProcessEnum.PRODUCT_DELETE
    // ){

      const command = new PublishCommand({
        TopicArn: this.productsSnsTopicArn,
        Message: JSON.stringify(messageDto)
      })
  
      this.logger.log(`sendMessage: command=${JSON.stringify(command)}`);
      
      return this.snsClient.send(command)
      .then( (result: any) => `message sent, messageId=${result.MessageId}` )
      .catch( (error) => {
        this.logger.error(`sendMessage: error=${JSON.stringify(error)}`);
        throw new Error(`Error sending message to SNS: ${error.message}`);
      })

    // }

    // throw new Error(`process not implement, process=${messageDto.process}`);

  }

}
