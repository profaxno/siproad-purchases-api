import { Brackets, DataSource, In, InsertResult, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import * as moment from 'moment-timezone';

import { DateFormatEnum, ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';

import { PurchaseOrderDto, PurchaseOrderProductDto } from './dto/purchase-order.dto';
import { PurchaseOrderSearchInputDto } from './dto/purchase-order-search.dto';
import { PurchaseOrder, PurchaseOrderProduct } from './entities';

import { Company } from '../companies/entities/company.entity';
import { CompanyService } from '../companies/company.service';


import { User } from '../users/entities/user.entity';
import { UserService } from '../users/user.service';

import { Product } from '../products/entities';
import { ProductService } from '../products/product.service';

import { MessageDto } from 'src/data-transfer/dto/message.dto';
import { ProcessEnum, SourceEnum } from 'src/data-transfer/enums';

import { MovementDto } from 'src/products/dto/movement.dto';
import { MovementReasonEnum, MovementTypeEnum } from 'src/products/enums';

import { DocumentTypeDto } from './dto/document-type.dto';
import { DocumentType } from '../documentTypes/entities/document-type.entity';

import { DataReplicationService } from 'src/data-transfer/data-replication/data-replication.service';
import { PurchaseOrderStatusEnum } from './enums/purchase-order-status.enum';

import { JsonBasic } from 'src/data-transfer/interface/json-basic.interface';

import { PurchaseTypeDto } from './dto/purchase-type.dto';
import { PurchaseType } from './entities/purchase-type.entity';

import { PurchaseSequence } from './entities/purchase-sequence.entity';
import { ProductDto } from '../products/dto';

@Injectable()
export class PurchaseOrderService {

  private readonly logger = new Logger(PurchaseOrderService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,
    
    @InjectDataSource('purchasesConn')
    private readonly dataSource: DataSource,

    @InjectRepository(PurchaseOrder, 'purchasesConn')
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    
    @InjectRepository(PurchaseOrderProduct, 'purchasesConn')
    private readonly purchaseOrderProductRepository: Repository<PurchaseOrderProduct>,

    private readonly productService: ProductService,
    private readonly replicationService: DataReplicationService
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  // async updateBatch(dtoList: PurchaseOrderDto[]): Promise<ProcessSummaryDto>{
  //   this.logger.warn(`updateBatch: starting process... listSize=${dtoList.length}`);
  //   const start = performance.now();
    
  //   let processSummaryDto: ProcessSummaryDto = new ProcessSummaryDto(dtoList.length);
  //   let i = 0;
  //   for (const dto of dtoList) {
      
  //     await this.update(dto)
  //     .then( () => {
  //       processSummaryDto.rowsOK++;
  //       processSummaryDto.detailsRowsOK.push(`(${i++}) name=${dto.name}, message=OK`);
  //     })
  //     .catch(error => {
  //       processSummaryDto.rowsKO++;
  //       processSummaryDto.detailsRowsKO.push(`(${i++}) name=${dto.name}, error=${error}`);
  //     })

  //   }
    
  //   const end = performance.now();
  //   this.logger.log(`updateBatch: executed, runtime=${(end - start) / 1000} seconds`);
  //   return processSummaryDto;
  // }

  update(dto: PurchaseOrderDto): Promise<PurchaseOrderDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.purchaseOrderRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: PurchaseOrder) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg})`);
        throw new NotFoundException(msg);
      }
      
      return entity;
    })
    .then( (entity: PurchaseOrder) => this.prepareEntity(entity, dto) )// * prepare
    .then( (entity: PurchaseOrder) => this.save(entity) ) // * update
    .then( (entity: PurchaseOrder) => {

      return this.updatePurchaseOrderProduct(entity, dto.productList) // * create purchaseOrderProduct
      .then( (purchaseOrderProductList: PurchaseOrderProduct[]) => this.generatePurchaseOrderWithProductList(entity, purchaseOrderProductList) ) // * generate order with purchaseOrderProduct
      .then( (dto: PurchaseOrderDto) => {
        this.updateMovements(dto);
      
        const end = performance.now();
        this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
        return dto;
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`update: error=${error.message}`);
      throw error;
    })

    // // * find order
    // const inputDto: SearchInputDto = new SearchInputDto(dto.id);
      
    // return this.findByValue({}, inputDto)
    // .then( (entityList: PurchaseOrder[]) => {

    //   // * validate
    //   if(entityList.length == 0){
    //     const msg = `order not found, id=${dto.id}`;
    //     this.logger.warn(`update: not executed (${msg})`);
    //     throw new NotFoundException(msg);
    //   }

    //   // * update
    //   const entity = entityList[0];
      
    //   return this.prepareEntity(entity, dto) // * prepare
    //   .then( (entity: PurchaseOrder) => this.save(entity) ) // * update
    //   .then( (entity: PurchaseOrder) => {
        
    //     return this.updatePurchaseOrderProduct(entity, dto.productList) // * create purchaseOrderProduct
    //     .then( (purchaseOrderProductList: PurchaseOrderProduct[]) => this.generatePurchaseOrderWithProductList(entity, purchaseOrderProductList) ) // * generate order with purchaseOrderProduct
    //     .then( (dto: PurchaseOrderDto) => {
    //       this.updateMovements(dto);
        
    //       const end = performance.now();
    //       this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
    //       return dto;
    //     })

    //   })
      
    // })
    // .catch(error => {
    //   if(error instanceof NotFoundException)
    //     throw error;

    //   this.logger.error(`update: error=${error.message}`);
    //   throw error;
    // })

  }

  create(dto: PurchaseOrderDto): Promise<PurchaseOrderDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    const entity = new PurchaseOrder();
    
    return this.prepareEntity(entity, dto) // * prepare
    .then( (entity: PurchaseOrder) => this.saveGenerateCode(entity) ) // * update
    .then( (entity: PurchaseOrder) => {

      return this.updatePurchaseOrderProduct(entity, dto.productList) // * create purchaseOrderProduct
      .then( (purchaseOrderProductList: PurchaseOrderProduct[]) => this.generatePurchaseOrderWithProductList(entity, purchaseOrderProductList) ) // * generate order with purchaseOrderProduct
      .then( (dto: PurchaseOrderDto) => {
        this.updateMovements(dto);
      
        const end = performance.now();
        this.logger.log(`create: executed, runtime=${(end - start) / 1000} seconds`);
        return dto;
      })

    })
    .catch(error => {
      if(error instanceof NotFoundException || error instanceof AlreadyExistException)
        throw error;

      this.logger.error(`create: error=${error.message}`);
      throw error;
    })
    
  }

  remove(id: string): Promise<string> {
    this.logger.log(`remove: starting process... id=${id}`);
    const start = performance.now();

    return this.purchaseOrderRepository.findOne({
      where: { id },
    })
    .then( (entity: PurchaseOrder) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${id}`;
        this.logger.warn(`update: not executed (${msg})`);
        throw new NotFoundException(msg);
      }
      
      // * delete: update field active
      entity.active = false;
      return entity;
    })
    .then( (entity: PurchaseOrder) => this.save(entity) )
    .then( () => {
      const end = performance.now();
      this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
      return 'deleted';
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      if(error.errno == 1217) {
        const msg = 'entity is being used';
        this.logger.warn(`removeProduct: not executed (${msg})`, error);
        throw new IsBeingUsedException(msg);
      }

      this.logger.error('remove: error', error);
      throw error;
    })

    // // * find order
    // const inputDto: SearchInputDto = new SearchInputDto(id);
    
    // return this.findByValue({}, inputDto)
    // .then( (entityList: PurchaseOrder[]) => {
  
    //   // * validate
    //   if(entityList.length == 0){
    //     const msg = `entity not found, id=${id}`;
    //     this.logger.warn(`remove: not executed (${msg})`);
    //     throw new NotFoundException(msg);
    //   }

    //   // * delete: update field active
    //   const entity = entityList[0];
    //   entity.active = false;

    //   return this.save(entity)
    //   .then( () => {
    //     const end = performance.now();
    //     this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
    //     return 'deleted';

    //   })

    // })
    // .catch(error => {
    //   if(error instanceof NotFoundException)
    //     throw error;

    //   if(error.errno == 1217) {
    //     const msg = 'entity is being used';
    //     this.logger.warn(`removeProduct: not executed (${msg})`, error);
    //     throw new IsBeingUsedException(msg);
    //   }

    //   this.logger.error('remove: error', error);
    //   throw error;
    // })

  }

  // find(companyId: string, paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<PurchaseOrderDto[]> {
  //   const start = performance.now();

  //   return this.findByValue(paginationDto, inputDto, companyId)
  //   .then( (entityList: PurchaseOrder[]) => entityList.map( (entity) => this.generatePurchaseOrderWithProductList(entity, entity.purchaseOrderProduct) ) )
  //   .then( (dtoList: PurchaseOrderDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `orders not found`;
  //       this.logger.warn(`find: ${msg}`);
  //       return [];
  //       // throw new NotFoundException(msg);
  //     }

  //     const end = performance.now();
  //     this.logger.log(`find: executed, runtime=${(end - start) / 1000} seconds`);
  //     return dtoList;
  //   })
  //   .catch(error => {
  //     this.logger.error(`find: error`, error);
  //     throw error;
  //   })
 
  // }

  searchByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: PurchaseOrderSearchInputDto): Promise<PurchaseOrderDto[]> {
    const start = performance.now();

    return this.searchEntitiesByValues(companyId, paginationDto, inputDto)
    .then( (entityList: PurchaseOrder[]) => entityList.map( (entity) => this.generatePurchaseOrderWithProductList(entity, entity.purchaseOrderProduct) ) )
    .then( (dtoList: PurchaseOrderDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `entities not found, inputDto=${JSON.stringify(inputDto)}`;
        this.logger.warn(`searchByValues: ${msg}`);
        throw new NotFoundException(msg);
      }

      const end = performance.now();
      this.logger.log(`searchByValues: executed, runtime=${(end - start) / 1000} seconds`);
      return dtoList;
    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`searchByValues: error`, error);
      throw error;
    })
    
  }

  // findOneById(id: string, companyId?: string): Promise<PurchaseOrderDto[]> {
  //   const start = performance.now();
  //   const inputDto: SearchInputDto = new SearchInputDto(id);
        
  //   // * find product
  //   return this.findByValue({}, inputDto, companyId)
  //   .then( (entityList: PurchaseOrder[]) => entityList.map( (entity) => this.generatePurchaseOrderWithProductList(entity, entity.purchaseOrderProduct) ) )
  //   .then( (dtoList: PurchaseOrderDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `entity not found, id=${id}`;
  //       this.logger.warn(`findOneById: ${msg}`);
  //       throw new NotFoundException(msg);
  //     }

  //     const end = performance.now();
  //     this.logger.log(`findOneById: executed, runtime=${(end - start) / 1000} seconds`);
  //     return dtoList;
  //   })
  //   .catch(error => {
  //     if(error instanceof NotFoundException)
  //       throw error;

  //     this.logger.error(`findOneById: error`, error);
  //     throw error;
  //   })
    
  // }

  private prepareEntity(entity: PurchaseOrder, dto: PurchaseOrderDto): Promise<PurchaseOrder> {
  
    const company = new Company();
    company.id = dto.companyId;

    const user = new User();
    user.id = dto.userId;

    const purchaseType = new PurchaseType();
    purchaseType.id = dto.purchaseTypeId;

    const documentType = new DocumentType();
    documentType.id = dto.documentTypeId;

    try {
      entity.id           = dto.id ? dto.id : undefined;
      entity.code         = dto.code ? dto.code : undefined;
      entity.company      = company;
      entity.user         = user;
      entity.purchaseType = purchaseType;
      entity.documentType = dto.documentTypeId ? documentType : undefined;
      entity.providerIdDoc= dto.providerIdDoc?.toUpperCase();
      entity.providerName = dto.providerName?.toUpperCase();
      entity.providerEmail= dto.providerEmail?.toUpperCase();
      entity.providerPhone= dto.providerPhone;
      entity.providerAddress = dto.providerAddress?.toUpperCase();
      entity.comment      = dto.comment;
      entity.amount       = dto.amount;
      entity.documentNumber = dto.documentNumber;
      entity.status       = dto.status;
      
      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  // private prepareEntity(entity: PurchaseOrder, dto: PurchaseOrderDto): Promise<PurchaseOrder> {
  
  //   // * find company
  //   const inputDto: SearchInputDto = new SearchInputDto(dto.companyId);
    
  //   return this.companyService.findByValue({}, inputDto)
  //   .then( (companyList: Company[]) => {

  //     if(companyList.length == 0){
  //       const msg = `company not found, id=${dto.companyId}`;
  //       this.logger.warn(`create: not executed (${msg})`);
  //       throw new NotFoundException(msg);
  //     }

  //     // * find user
  //     const inputDto: SearchInputDto = new SearchInputDto(dto.userId);

  //     return this.userService.findByValue({}, inputDto)
  //     .then( (userList: User[]) => {
    
  //       if(userList.length == 0){
  //         const msg = `user not found, id=${dto.companyId}`;
  //         this.logger.warn(`create: not executed (${msg})`);
  //         throw new NotFoundException(msg);
  //       }

  //       return ( dto.code ? Promise.resolve(dto.code) : this.generateCode(dto.companyId) )// * generate code
  //       .then( (code: string) => {
          
  //         // * prepare entity
  //         entity.code           = code.toUpperCase();
  //         entity.company        = companyList[0];
  //         entity.user           = userList[0];
  //         entity.providerIdDoc  = dto.providerIdDoc?.toUpperCase();
  //         entity.providerName   = dto.providerName?.toUpperCase();
  //         entity.providerEmail  = dto.providerEmail?.toUpperCase();
  //         entity.providerPhone  = dto.providerPhone;
  //         entity.providerAddress = dto.providerAddress?.toUpperCase();
  //         entity.comment        = dto.comment;
  //         entity.discount       = dto.discount;
  //         entity.discountPct    = dto.discountPct;
  //         entity.status         = dto.status;
          
  //         return entity;
  //       })

  //     })
      
  //   })
    
  // }

  private save(entity: PurchaseOrder): Promise<PurchaseOrder> {
    const start = performance.now();

    const newEntity: PurchaseOrder = this.purchaseOrderRepository.create(entity);

    return this.purchaseOrderRepository.save(newEntity)
    .then( (entity: PurchaseOrder) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  private saveGenerateCode(entity: PurchaseOrder): Promise<PurchaseOrder> {
    const start = performance.now();

    return this.dataSource.transaction( async(manager) => {

      const companyId = entity.company.id;
      
      // * get sequence
      const purchaseSequenceRepository = manager.getRepository(PurchaseSequence);
      
      let sequenceEntity = await purchaseSequenceRepository
      .createQueryBuilder('a')
      .setLock('pessimistic_write')
      .where('a.companyId = :companyId', { companyId })
      .getOne();

      // * increase sequence
      if (!sequenceEntity) 
        sequenceEntity = purchaseSequenceRepository.create({ companyId, lastCode: 1 });
      else sequenceEntity.lastCode += 1;

      // * save sequence
      await purchaseSequenceRepository.save(sequenceEntity);

      // * generate order
      const purchaseOrderRepository = manager.getRepository(PurchaseOrder);

      const newOrder = purchaseOrderRepository.create({
        ...entity,
        code: sequenceEntity.lastCode
      });

      // * save order
      return purchaseOrderRepository.save(newOrder);

    })
    .then( (entity: PurchaseOrder) => {
      const end = performance.now();
      this.logger.log(`saveGenerateCode: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  private updatePurchaseOrderProduct(order: PurchaseOrder, purchaseOrderProductDtoList: PurchaseOrderProductDto[] = []): Promise<PurchaseOrderProduct[]> {
    this.logger.log(`updatePurchaseOrderProduct: starting process... order=${JSON.stringify(order)}, purchaseOrderProductDtoList=${JSON.stringify(purchaseOrderProductDtoList)}`);
    const start = performance.now();

    if(purchaseOrderProductDtoList.length == 0){
      this.logger.warn(`updatePurchaseOrderProduct: not executed (order product list empty)`);
      return Promise.resolve([]);
    }

    // * find products by id
    const productIdList = purchaseOrderProductDtoList.map( (item) => item.id );
    const uniqueProductIdList: string[] = [...new Set(productIdList)]; // * remove duplicates

    // const inputDto: SearchInputDto = new SearchInputDto(undefined, undefined, uniqueProductIdList);

    return this.productService.findByIds({}, uniqueProductIdList)
    .then( (productList: Product[]) => {

      // * validate
      if(productList.length !== uniqueProductIdList.length){
        const productIdNotFoundList: string[] = uniqueProductIdList.filter( (id) => !productList.find( (product) => product.id == id) );
        const msg = `products not found, IdList=(${uniqueProductIdList.length})${JSON.stringify(uniqueProductIdList)}, IdNotFoundList=(${productIdNotFoundList.length})${JSON.stringify(productIdNotFoundList)}`;
        throw new NotFoundException(msg); 
      }

      // * generate order product list
      return purchaseOrderProductDtoList.map( (purchaseOrderProductDto: PurchaseOrderProductDto) => {
        
        const product = productList.find( (value) => value.id == purchaseOrderProductDto.id);

        const purchaseOrderProduct = new PurchaseOrderProduct();
        purchaseOrderProduct.purchaseOrder = order;
        purchaseOrderProduct.product  = product;
        purchaseOrderProduct.qty      = purchaseOrderProductDto.qty;
        purchaseOrderProduct.comment  = purchaseOrderProductDto.comment;
        purchaseOrderProduct.name     = product.name;
        purchaseOrderProduct.code     = product.code;
        purchaseOrderProduct.cost     = purchaseOrderProductDto.cost;
        purchaseOrderProduct.amount   = purchaseOrderProductDto.amount;
        purchaseOrderProduct.status   = purchaseOrderProductDto.status;
        
        return purchaseOrderProduct;
      })

    })
    .then( (purchaseOrderProductListToInsert: PurchaseOrderProduct[]) => {
      
      return this.purchaseOrderProductRepository.findBy( { purchaseOrder: order } ) // * find order products to remove
      .then( (purchaseOrderProductListToDelete: PurchaseOrderProduct[]) => this.purchaseOrderProductRepository.remove(purchaseOrderProductListToDelete) ) // * remove order products
      .then( () => this.bulkInsertPurchaseOrderProducts(purchaseOrderProductListToInsert) ) // * insert order products
      .then( (purchaseOrderProductList: PurchaseOrderProduct[]) => {

        this.updateProductCost(purchaseOrderProductDtoList, purchaseOrderProductList);

        const end = performance.now();
        this.logger.log(`updatePurchaseOrderProduct: OK, runtime=${(end - start) / 1000} seconds`);
        return purchaseOrderProductList;
      })

    })
    .catch(error => {
      this.logger.error(`updatePurchaseOrderProduct: error=${error.message}`);
      throw error;
    })

  }

  private bulkInsertPurchaseOrderProducts(purchaseOrderProductList: PurchaseOrderProduct[]): Promise<PurchaseOrderProduct[]> {
    const start = performance.now();
    this.logger.log(`bulkInsertPurchaseOrderProducts: starting process... listSize=${purchaseOrderProductList.length}`);

    const newPurchaseOrderProductList: PurchaseOrderProduct[] = purchaseOrderProductList.map( (value) => this.purchaseOrderProductRepository.create(value));
    
    try {
      return this.purchaseOrderProductRepository.manager.transaction( async(transactionalEntityManager) => {
        
        return transactionalEntityManager
        .createQueryBuilder()
        .insert()
        .into(PurchaseOrderProduct)
        .values(newPurchaseOrderProductList)
        .execute()
        .then( (insertResult: InsertResult) => {
          const end = performance.now();
          this.logger.log(`bulkInsertPurchaseOrderProducts: OK, runtime=${(end - start) / 1000} seconds, insertResult=${JSON.stringify(insertResult.raw)}`);
          return newPurchaseOrderProductList;
        })

      })

    } catch (error) {
      this.logger.error(`bulkInsertPurchaseOrderProducts: error=${error.message}`);
      throw error;
    }
  }

  private updateMovements(dto: PurchaseOrderDto): void {

    if(dto.status == PurchaseOrderStatusEnum.ORDER || dto.status == PurchaseOrderStatusEnum.PAID) {  
      // * replication data
      const movementDtoList = dto.productList.map( (value) => new MovementDto(MovementTypeEnum.IN, MovementReasonEnum.PURCHASE, value.qty, value.id, dto.user?.id, undefined, dto.id));
      const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.MOVEMENT_UPDATE, JSON.stringify(movementDtoList));
      this.replicationService.sendMessages([messageDto]);
    }

    if(dto.status == PurchaseOrderStatusEnum.CANCELLED) {
      const jsonBasic: JsonBasic = { id: dto.id }
      const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.MOVEMENT_DELETE, JSON.stringify(jsonBasic));
      this.replicationService.sendMessages([messageDto]);
    }
    
  }
  // private findByValue(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<PurchaseOrder[]> {
  //   const {page=1, limit=this.dbDefaultLimit} = paginationDto;

  //   // * search by id or partial value
  //   const value = inputDto.search;
  //   if(value) {
  //     const whereById     = { id: value, active: true };
  //     const whereByValue  = { company: { id: companyId }, comment: Like(`%${value}%`), active: true };
  //     const where = isUUID(value) ? whereById : whereByValue;

  //     return this.purchaseOrderRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: where,
  //       relations: {
  //         purchaseOrderProduct: true
  //       },
  //       order: { createdAt: "DESC" }
  //     })
  //   }

  //   // * search by value list
  //   if(inputDto.searchList?.length > 0){
  //     return this.purchaseOrderRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: {
  //         company: { 
  //           id: companyId
  //         },
  //         comment: Raw( (fieldName) => inputDto.searchList.map(value => `${fieldName} LIKE '%${value.replace(' ', '%')}%'`).join(' OR ') ),
  //         // comment: In(inputDto.searchList),
  //         active: true
  //       },
  //       relations: {
  //         purchaseOrderProduct: true
  //       },
  //       order: { createdAt: "DESC" }
  //     })
  //   }

  //   // * search all
  //   return this.purchaseOrderRepository.find({
  //     take: limit,
  //     skip: (page - 1) * limit,
  //     where: { 
  //       company: { 
  //         id: companyId 
  //       },
  //       active: true 
  //     },
  //     relations: {
  //       purchaseOrderProduct: true
  //     },
  //     order: { createdAt: "DESC" }
  //   })
    
  // }

  private searchEntitiesByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: PurchaseOrderSearchInputDto): Promise<PurchaseOrder[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    const query = this.purchaseOrderRepository.createQueryBuilder('a')
    .leftJoinAndSelect('a.company', 'c')
    .leftJoinAndSelect('a.purchaseType', 'pt')
    .leftJoinAndSelect('a.purchaseOrderProduct', 'op')
    .leftJoinAndSelect('op.product', 'p')
    .where('a.companyId = :companyId', { companyId })
    .andWhere('a.active = :active', { active: true });

    if(inputDto.createdAtInit) {
      const createdAtInit = moment.tz(inputDto.createdAtInit, DateFormatEnum.TIME_ZONE).utc().format(DateFormatEnum.DATETIME_FORMAT)
      query.andWhere('a.createdAt >= :createdAtInit', { createdAtInit: createdAtInit });
    }

    if(inputDto.createdAtEnd) {
      const createdAtEnd = moment.tz(inputDto.createdAtEnd, DateFormatEnum.TIME_ZONE).utc().format(DateFormatEnum.DATETIME_FORMAT)
      query.andWhere('a.createdAt <= :createdAtEnd', { createdAtEnd: createdAtEnd });
    }

    if(inputDto.code) {
      const formatted = `%${inputDto.code?.toLowerCase().replace(' ', '%')}%`;
      query.andWhere('a.code LIKE :code', { code: formatted });
    }

    if(inputDto.providerNameIdDoc) {
      const formatted = `%${inputDto.providerNameIdDoc?.toLowerCase().replace(' ', '%')}%`;
      query.andWhere(
        new Brackets(qb => {
          qb.where('a.providerName LIKE :providerName').orWhere('a.providerIdDoc LIKE :providerIdDoc');
        }),
        {
          providerName: formatted,
          providerIdDoc: formatted,
        }
      );

      // const formatted = `%${inputDto.providerNameIdDoc.replace(' ', '%')}%`;
      // query.andWhere('a.providerName LIKE :providerName OR a.providerIdDoc LIKE :providerIdDoc', { providerName: formatted, providerIdDoc: formatted });
    }

    if(inputDto.comment) {
      const formatted = `%${inputDto.comment?.toLowerCase().replace(' ', '%')}%`;
      query.andWhere('a.comment LIKE :comment', { comment: formatted });
    }

    return query
    .skip((page - 1) * limit)
    .take(limit)
    .orderBy("a.createdAt", "DESC")
    .getMany();
  }

  generatePurchaseOrderWithProductList(order: PurchaseOrder, purchaseOrderProductList: PurchaseOrderProduct[]): PurchaseOrderDto {
    
    const purchaseOrderProductDtoList: PurchaseOrderProductDto[] = purchaseOrderProductList.map( (purchaseOrderProduct: PurchaseOrderProduct) => new PurchaseOrderProductDto(purchaseOrderProduct.product.id, purchaseOrderProduct.qty, purchaseOrderProduct.name, purchaseOrderProduct.cost, purchaseOrderProduct.amount, purchaseOrderProduct.comment, purchaseOrderProduct.code, purchaseOrderProduct.status) );
    const purchaseTypeDto = new PurchaseTypeDto(order.company.id, order.purchaseType.name, order.purchaseType.id);
    const documentTypeDto = order.documentNumber ? new DocumentTypeDto(order.company.id, order.documentType.name, order.documentType.id) : undefined;

    // * format createdAt
    let createdAtFormat = moment(order.createdAt).format(DateFormatEnum.DATETIME_FORMAT);
    createdAtFormat     = moment.utc(createdAtFormat).tz(DateFormatEnum.TIME_ZONE).format(DateFormatEnum.DATETIME_FORMAT);

    // * generate order dto
    const orderDto = new PurchaseOrderDto(
      order.company.id,
      order.id,
      purchaseTypeDto.id,
      documentTypeDto?.id,
      order.code,
      order.providerIdDoc,
      order.providerName,
      order.providerEmail,
      order.providerPhone,
      order.providerAddress,
      order.comment,
      order.amount,
      order.documentNumber,
      order.status,
      createdAtFormat,
      order.company,
      order.user,
      purchaseTypeDto,
      documentTypeDto,
      purchaseOrderProductDtoList
    );

    return orderDto;
  }

  private updateProductCost(dtoList: PurchaseOrderProductDto[] = [], entityList: PurchaseOrderProduct[] = []): void {

    // * update product cost
    const updateProductIdList = dtoList.filter(value => value.updateProductCost).map(value => value.id);
    
    const productDtoList = entityList.reduce( (acc, value) => {
      if(updateProductIdList.includes(value.product.id)){
        const cost = value.amount / value.qty;
        const product = value.product;
        const productDto = new ProductDto(product.company.id, product.name, cost, product.type, product.enable4Sale, product.id, product.productCategory?.id, product.code, product.description, product.unit, product.price);  
        acc.push(productDto);
      }

      return acc;
    }, []);

    // * replication data
    const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.PRODUCT_UPDATE, JSON.stringify(productDtoList));
    this.replicationService.sendMessages([messageDto]);
  }
}
