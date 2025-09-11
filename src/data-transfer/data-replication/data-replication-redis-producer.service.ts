import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { MessageDto } from '../dto/message.dto';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';  // Import Redis from ioredis
import { ProcessEnum } from '../enums';

@Injectable()
export class DataReplicationRedisProducerService {
  
  private readonly logger = new Logger(DataReplicationRedisProducerService.name);

  private readonly redisHost: string = "";
  private readonly redisPort: number = 0;
  private readonly redisPassword: string = "";
  private readonly redisFamily: number = 0;
  private readonly redisJobQueueProducts: string = "";

  private queueProducts: Queue;

  constructor(
    private readonly configService: ConfigService
  ) {
    // * Retrieve the Redis configuration values from ConfigService
    this.redisHost = this.configService.get('redisHost');
    this.redisPort = this.configService.get('redisPort');
    this.redisPassword = this.configService.get('redisPassword');
    this.redisFamily = this.configService.get('redisFamily');
    this.redisJobQueueProducts = this.configService.get('redisJobQueueProducts');
    

    // * Create the Redis client using ioredis
    const redisClient = new Redis({
      host: this.redisHost,
      port: this.redisPort,
      password: this.redisPassword,
      family: this.redisFamily
    });

    // * Configure the BullMQ queue with the redisClient
    this.queueProducts = new Queue(this.redisJobQueueProducts, {
      connection: redisClient,
    });
  }

  // * Method to send a message to the queue
  async sendMessageToQueues(messageDto: MessageDto): Promise<string> {

    // * generate promises
    const promiseList: Promise<string>[] = [];
    promiseList.push(this.sendMessage(this.queueProducts, messageDto));
    
    // * exec promises
    const promiseResultList = await Promise.allSettled(promiseList)
    
    // * process results
    let result: string = "";
    promiseResultList.forEach( (promiseResult, index) => {
      if (promiseResult.status === 'fulfilled') 
        result += `${index} job success ${promiseResult.value}|`;
      else result += `${index} job failed: ${promiseResult.reason}|`;
    });
    
    return result;

    // * select queue
    // let queue: Queue;

    // switch (messageDto.process) {
    //   case ProcessEnum.MOVEMENT_UPDATE:
    //   case ProcessEnum.MOVEMENT_DELETE: {
    //     queue = this.queueProducts
    //     break;
    //   }
    // }

    // if(!queue) {
    //   throw new Error(`process no implemented, process=${messageDto.process}`);
    // }

    // return queue.add('job', messageDto)
    // .then((job) => `job generated, jobId=${job.id}`)
    // .catch((error) => {
    //   this.logger.error(`sendMessage: error=${JSON.stringify(error)}`);
    //   throw new Error(`Error sending message to REDIS: ${error.message}`);
    // });
  }

  private sendMessage(queue: Queue, messageDto: MessageDto) {

    return queue.add('job', messageDto)
    .then((job: Job) => `job generated, id=${job.id}`)
    .catch((error) => {
      this.logger.error(`sendMessage: error=${JSON.stringify(error)}`);
      throw error;
    });

  }
  
}
