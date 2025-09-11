import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import Redis from 'ioredis';
import { Worker } from 'bullmq';

import { MessageDto } from '../dto/message.dto';
import { ProcessEnum } from '../enums';
import { JsonBasic } from '../interface/json-basic.interface';

import { CompanyDto } from 'src/purchases/companies/dto/company.dto';
import { CompanyService } from 'src/purchases/companies/company.service';

import { UserDto } from 'src/purchases/users/dto/user.dto';
import { UserService } from 'src/purchases/users/user.service';

import { ProductDto } from 'src/purchases/products/dto';
import { ProductService } from 'src/purchases/products/product.service';
import { ProductCategoryService } from 'src/purchases/products/product-category.service';
import { DocumentTypeService } from 'src/purchases/documentTypes/document-type.service';

@Injectable()
export class DataReceptionWorkerService implements OnModuleInit {

  private readonly logger = new Logger(DataReceptionWorkerService.name);
  
  private readonly redisHost: string = "";
  private readonly redisPort: number = 0;
  private readonly redisPassword: string = "";
  private readonly redisFamily: number = 0;
  private readonly redisJobQueuePurchases: string = "";
  
  private workerPurchases: Worker;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly companyService: CompanyService,
    private readonly userService: UserService,
    private readonly documentTypeService: DocumentTypeService,
    private readonly productService: ProductService,
    private readonly productCategoryService: ProductCategoryService
  ) {
    // * Retrieve the Redis configuration values from ConfigService
    this.redisHost = this.configService.get('redisHost');
    this.redisPort = this.configService.get('redisPort');
    this.redisPassword = this.configService.get('redisPassword');
    this.redisFamily = this.configService.get('redisFamily');
    this.redisJobQueuePurchases = this.configService.get('redisJobQueuePurchases');
  }

  // * Implementing OnModuleInit to initialize the worker when the module is loaded
  async onModuleInit() {
    
    // * Create the Redis client using ioredis
    const redisClient = new Redis({
      host: this.redisHost,
      port: this.redisPort,
      password: this.redisPassword,
      family: this.redisFamily,
      maxRetriesPerRequest: null
    });

    // * Create a BullMQ Worker to listen to the 'jobQueue' queue
    this.workerPurchases = new Worker(this.redisJobQueuePurchases, async job => {
      const start = performance.now();
      this.logger.log(`workerPurchases: starting process... jobId=${job.id}, data: ${JSON.stringify(job.data)}`);

      return this.processJob(job.data)
      .then( (response: string) => {
        const end = performance.now();
        this.logger.log(`workerPurchases: executed, runtime=${(end - start) / 1000} seconds, jobId=${job.id} response=${response}`);
        return true;
        
      })
      .catch( (error: Error) => {
        this.logger.error(error.stack);
        throw error;
      })
      
    }, {
      connection: redisClient,
    });

    this.logger.log('Worker initialized and listening for jobs...');
  }

  private processJob(messageDto: MessageDto): Promise<string> {
    //this.logger.log(`processJob: messageDto=${JSON.stringify(messageDto)}`);
    
    switch (messageDto.process) {

      case ProcessEnum.COMPANY_UPDATE: {
        const dtoList: CompanyDto[] = JSON.parse(messageDto.jsonData);
        return this.companyService.updateBatch(dtoList)
        .then( () => 'update company executed' )
      }
      case ProcessEnum.COMPANY_DELETE: {
        const dtoList: JsonBasic[] = JSON.parse(messageDto.jsonData);
        const idList = dtoList.map(value => value.id);
        return this.companyService.removeBatch(idList)
        .then( () => 'delete company executed' )
      }
      case ProcessEnum.USER_UPDATE: {
        const dtoList: UserDto[] = JSON.parse(messageDto.jsonData);
        return this.userService.updateBatch(dtoList)
        .then( () => 'update user executed' )
      }
      case ProcessEnum.USER_DELETE: {
        const dtoList: JsonBasic[] = JSON.parse(messageDto.jsonData);
        const idList = dtoList.map(value => value.id);
        return this.userService.removeBatch(idList)
        .then( () => 'delete user executed' )
      }
      case ProcessEnum.DOCUMENT_TYPE_UPDATE: {
        const dtoList: UserDto[] = JSON.parse(messageDto.jsonData);
        return this.documentTypeService.updateBatch(dtoList)
        .then( () => 'update document type executed' )
      }
      case ProcessEnum.DOCUMENT_TYPE_DELETE: {
        const dtoList: JsonBasic[] = JSON.parse(messageDto.jsonData);
        const idList = dtoList.map(value => value.id);
        return this.documentTypeService.removeBatch(idList)
        .then( () => 'delete document type executed' )
      }
      case ProcessEnum.PRODUCT_UPDATE: {
        const dtoList: ProductDto[] = JSON.parse(messageDto.jsonData);
        return this.productService.updateBatch(dtoList)
        .then( () => 'update product executed' )
      }
      case ProcessEnum.PRODUCT_DELETE: {
        const dtoList: JsonBasic[] = JSON.parse(messageDto.jsonData);
        const idList = dtoList.map(value => value.id);
        return this.productService.removeBatch(idList)
        .then( () => 'delete product executed' )
      }
      case ProcessEnum.PRODUCT_CATEGORY_UPDATE: {
        const dtoList: ProductDto[] = JSON.parse(messageDto.jsonData);
        return this.productCategoryService.updateBatch(dtoList)
        .then( () => 'update product category executed' )
      }
      case ProcessEnum.PRODUCT_CATEGORY_DELETE: {
        const dtoList: JsonBasic[] = JSON.parse(messageDto.jsonData);
        const idList = dtoList.map(value => value.id);
        return this.productCategoryService.removeBatch(idList)
        .then( () => 'delete product category executed' )
      }
      default: {
        this.logger.error(`process not implemented, process=${messageDto.process}`);
        return Promise.resolve('process not implemented');
        // throw new Error(`process not implement, process=${messageDto.process}`);
      }

    }

  }

}
