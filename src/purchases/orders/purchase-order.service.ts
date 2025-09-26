import { Brackets, DataSource, EntityManager, In, InsertResult, Like, Raw, Repository } from 'typeorm';
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

import { PurchaseTypeDto } from './dto/purchase-type.dto';
import { PurchaseType } from './entities/purchase-type.entity';

import { Company } from '../companies/entities/company.entity';

import { User } from '../users/entities/user.entity';

import { MessageDto } from 'src/data-transfer/dto/message.dto';
import { ProcessEnum, SourceEnum } from 'src/data-transfer/enums';

import { MovementDto } from 'src/products/dto/movement.dto';
import { MovementReasonEnum, MovementTypeEnum } from 'src/products/enums';

import { DataReplicationService } from 'src/data-transfer/data-replication/data-replication.service';
import { PurchaseOrderStatusEnum } from './enums/purchase-order-status.enum';

import { JsonBasic } from 'src/data-transfer/interface/json-basic.interface';


import { Sequence } from './entities/sequence.entity';
import { SequenceTypeEnum } from './enums/secuence-type.enum';
import { ProductCostDto } from 'src/products/dto/product-cost.dto';

@Injectable()
export class PurchaseOrderService {

  private readonly logger = new Logger(PurchaseOrderService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,
    
    @InjectDataSource('purchasesConn')
    private readonly dataSource: DataSource,

    @InjectRepository(PurchaseOrder, 'purchasesConn')
    private readonly orderRepository: Repository<PurchaseOrder>,
    
    @InjectRepository(PurchaseOrderProduct, 'purchasesConn')
    private readonly orderProductRepository: Repository<PurchaseOrderProduct>,

    private readonly replicationService: DataReplicationService
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  update(dto: PurchaseOrderDto): Promise<PurchaseOrderDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.orderRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: PurchaseOrder) => {
      
      // * validate
      if(!entity) {
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg})`);
        throw new NotFoundException(msg);
      }
      
      // * generate a list of products to update their cost
      const productIdListToUpdateCost = dto.productList.filter(value => value.updateProductCost).map(value => value.id);

      return this.updateStockMovements(dto) // * update stock movements
      .then( () => {

        // * process with transaction db
        return this.dataSource.transaction( (manager: EntityManager) => {

          // * get repositories
          const orderRepository : Repository<PurchaseOrder> = manager.getRepository(PurchaseOrder);
          const orderProductRepository: Repository<PurchaseOrderProduct> = manager.getRepository(PurchaseOrderProduct);

          return this.prepareEntity(entity, dto) // * prepare
          .then( (entity: PurchaseOrder) => this.save(entity, orderRepository) ) // * save
          .then( (entity: PurchaseOrder) => {
            return this.updatePurchaseOrderProduct(entity, dto.productList, orderProductRepository) 
            .then( (orderProductList: PurchaseOrderProduct[]) => this.generatePurchaseOrderWithProductList(entity, orderProductList) )
          })
          .then( (dto: PurchaseOrderDto) => {
            this.updateProductCost(dto, productIdListToUpdateCost);
            return dto;
          })

        })
        .then( (dto: PurchaseOrderDto) => {
          const end = performance.now();
          this.logger.log(`update: OK, runtime=${(end - start) / 1000} seconds`);
          return dto;
        })
        .catch(error => {
          const dto: PurchaseOrderDto = this.generatePurchaseOrderWithProductList(entity, entity.purchaseOrderProduct);
          this.updateStockMovements(dto); // * rollback stock movements
          throw error;
        })

      })

    })
    .catch(error => {
      if(error instanceof NotFoundException)
        throw error;

      this.logger.error(`update: error=${error.message}`);
      throw error;
    })

  }

  create(dto: PurchaseOrderDto): Promise<PurchaseOrderDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * generate a list of products to update their cost
    const productIdListToUpdateCost = dto.productList.filter(value => value.updateProductCost).map(value => value.id);

    // * process with transaction db
    return this.dataSource.transaction( (manager: EntityManager) => {

      // * get repositories
      const purchaseSequenceRepository: Repository<Sequence> = manager.getRepository(Sequence);
      const orderRepository : Repository<PurchaseOrder> = manager.getRepository(PurchaseOrder);
      const orderProductRepository: Repository<PurchaseOrderProduct> = manager.getRepository(PurchaseOrderProduct);

      return this.generateCode(dto.companyId, SequenceTypeEnum.ORDER, purchaseSequenceRepository) // * generate code
      .then( (code: number) => {

        // * set code
        dto.code = code;

        return this.prepareEntity(new PurchaseOrder(), dto) // * prepare
        .then( (entity: PurchaseOrder) => this.save(entity, orderRepository) ) // * save
        .then( (entity: PurchaseOrder) => {
          return this.updatePurchaseOrderProduct(entity, dto.productList, orderProductRepository) 
          .then( (orderProductList: PurchaseOrderProduct[]) => this.generatePurchaseOrderWithProductList(entity, orderProductList) ) // * generate dto
          .then( (dto: PurchaseOrderDto) => {
            this.updateProductCost(dto, productIdListToUpdateCost);
            return dto;
          })

        })

      })

    })
    .then( (dto: PurchaseOrderDto) => {

      return this.updateStockMovements(dto) // * update stock movements
      .then( () => {
        const end = performance.now();
        this.logger.log(`create: executed, runtime=${(end - start) / 1000} seconds`);
        return dto;
      })
      .catch(error => {
        this.remove(dto.id); // * rollback
        throw error;
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

    return this.orderRepository.findOne({
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

  private async generateCode(companyId: string, type: SequenceTypeEnum, saleSequenceRepository: Repository<Sequence>): Promise<number> {

    let sequenceEntity = await saleSequenceRepository
    .createQueryBuilder('a')
    .setLock('pessimistic_write')
    .where('a.companyId = :companyId', { companyId })
    .andWhere('a.type = :type', { type })
    .getOne();

    // * increase sequence
    if (!sequenceEntity) 
      sequenceEntity = saleSequenceRepository.create({ companyId, lastCode: 1 });
    else sequenceEntity.lastCode += 1;

    // * save sequence
    await saleSequenceRepository.save(sequenceEntity);

    return sequenceEntity.lastCode;
  }

  private prepareEntity(entity: PurchaseOrder, dto: PurchaseOrderDto): Promise<PurchaseOrder> {
  
    const company = new Company();
    company.id = dto.companyId;

    const user = new User();
    user.id = dto.userId;

    const purchaseType = new PurchaseType();
    purchaseType.id = dto.purchaseTypeId;

    // const documentType = new DocumentType();
    // documentType.id = dto.documentTypeId;

    try {
      entity.id           = dto.id ? dto.id : undefined;
      entity.code         = dto.code ? dto.code : undefined;
      entity.providerName = dto.providerName?.toUpperCase();
      entity.providerIdDoc= dto.providerIdDoc?.toUpperCase();
      entity.providerEmail= dto.providerEmail?.toUpperCase();
      entity.providerPhone= dto.providerPhone;
      entity.providerAddress = dto.providerAddress?.toUpperCase();
      entity.comment      = dto.comment;
      entity.amount       = dto.amount;
      entity.documentTypeId = dto.documentTypeId;
      entity.documentNumber = dto.documentNumber;
      entity.status       = dto.status;
      entity.company      = company;
      entity.user         = user;
      entity.purchaseType = purchaseType;
      // entity.documentType = dto.documentTypeId ? documentType : undefined;

      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  private save(entity: PurchaseOrder, orderRepository?: Repository<PurchaseOrder>): Promise<PurchaseOrder> {
    const start = performance.now();

    if(!orderRepository)
      orderRepository = this.orderRepository;

    const newEntity: PurchaseOrder = orderRepository.create(entity);

    return orderRepository.save(newEntity)
    .then( (entity: PurchaseOrder) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  private updatePurchaseOrderProduct(order: PurchaseOrder, orderProductDtoList: PurchaseOrderProductDto[] = [], orderProductRepository: Repository<PurchaseOrderProduct>): Promise<PurchaseOrderProduct[]> {
    this.logger.log(`updatePurchaseOrderProduct: starting process... order=${JSON.stringify(order)}, orderProductDtoList=${JSON.stringify(orderProductDtoList)}`);
    const start = performance.now();

    if(orderProductDtoList.length == 0){
      this.logger.warn('updatePurchaseOrderProduct: not executed (order product list empty)');
      return Promise.resolve([]);
    }

    // * create order-product
    return orderProductRepository.find({
      where: { purchaseOrder: order },
    })
    .then( (orderProductList: PurchaseOrderProduct[]) => orderProductRepository.remove(orderProductList) ) // * remove order products
    .then( () => {
      
      // * generate list to insert
      const orderProductList: PurchaseOrderProduct[] = orderProductDtoList.map( (value) => {
        
        const orderProduct = new PurchaseOrderProduct();
        orderProduct.purchaseOrderCode = order.code;
        orderProduct.productId= value.id;
        orderProduct.name     = value.name;
        orderProduct.code     = value.code;
        orderProduct.qty      = value.qty;
        orderProduct.comment  = value.comment;
        orderProduct.cost     = value.cost;
        orderProduct.amount   = value.amount;
        orderProduct.status   = value.status;
        orderProduct.purchaseOrder = order;
        
        return orderProductRepository.create(orderProduct);
      })

      // * bulk insert
      return orderProductRepository
      .createQueryBuilder()
      .insert()
      .into(PurchaseOrderProduct)
      .values(orderProductList)
      .execute()
      .then( (insertResult: InsertResult) => {
        const end = performance.now();
        this.logger.log(`updatePurchaseOrderProduct: OK, runtime=${(end - start) / 1000} seconds, insertResult=${JSON.stringify(insertResult.raw)}`);
        return orderProductList;
      })

    })
    .catch(error => {
      this.logger.error(`updatePurchaseOrderProduct: error=${error.message}`);
      throw error;
    })

  }

  // private updatePurchaseOrderProduct(order: PurchaseOrder, purchaseOrderProductDtoList: PurchaseOrderProductDto[] = []): Promise<PurchaseOrderProduct[]> {
  //   this.logger.log(`updatePurchaseOrderProduct: starting process... order=${JSON.stringify(order)}, purchaseOrderProductDtoList=${JSON.stringify(purchaseOrderProductDtoList)}`);
  //   const start = performance.now();

  //   if(purchaseOrderProductDtoList.length == 0){
  //     this.logger.warn(`updatePurchaseOrderProduct: not executed (order product list empty)`);
  //     return Promise.resolve([]);
  //   }

  //   // * find products by id
  //   const productIdList = purchaseOrderProductDtoList.map( (item) => item.id );
  //   const uniqueProductIdList: string[] = [...new Set(productIdList)]; // * remove duplicates

  //   // const inputDto: SearchInputDto = new SearchInputDto(undefined, undefined, uniqueProductIdList);

  //   return this.productService.findByIds({}, uniqueProductIdList)
  //   .then( (productList: Product[]) => {

  //     // * validate
  //     if(productList.length !== uniqueProductIdList.length){
  //       const productIdNotFoundList: string[] = uniqueProductIdList.filter( (id) => !productList.find( (product) => product.id == id) );
  //       const msg = `products not found, IdList=(${uniqueProductIdList.length})${JSON.stringify(uniqueProductIdList)}, IdNotFoundList=(${productIdNotFoundList.length})${JSON.stringify(productIdNotFoundList)}`;
  //       throw new NotFoundException(msg); 
  //     }

  //     // * generate order product list
  //     return purchaseOrderProductDtoList.map( (purchaseOrderProductDto: PurchaseOrderProductDto) => {
        
  //       const product = productList.find( (value) => value.id == purchaseOrderProductDto.id);

  //       const purchaseOrderProduct = new PurchaseOrderProduct();
  //       purchaseOrderProduct.purchaseOrder = order;
  //       purchaseOrderProduct.product  = product;
  //       purchaseOrderProduct.qty      = purchaseOrderProductDto.qty;
  //       purchaseOrderProduct.comment  = purchaseOrderProductDto.comment;
  //       purchaseOrderProduct.name     = product.name;
  //       purchaseOrderProduct.code     = product.code;
  //       purchaseOrderProduct.cost     = purchaseOrderProductDto.cost;
  //       purchaseOrderProduct.amount   = purchaseOrderProductDto.amount;
  //       purchaseOrderProduct.status   = purchaseOrderProductDto.status;
        
  //       return purchaseOrderProduct;
  //     })

  //   })
  //   .then( (purchaseOrderProductListToInsert: PurchaseOrderProduct[]) => {
      
  //     return this.purchaseOrderProductRepository.findBy( { purchaseOrder: order } ) // * find order products to remove
  //     .then( (purchaseOrderProductListToDelete: PurchaseOrderProduct[]) => this.purchaseOrderProductRepository.remove(purchaseOrderProductListToDelete) ) // * remove order products
  //     .then( () => this.bulkInsertPurchaseOrderProducts(purchaseOrderProductListToInsert) ) // * insert order products
  //     .then( (purchaseOrderProductList: PurchaseOrderProduct[]) => {

  //       this.updateProductCost(purchaseOrderProductDtoList, purchaseOrderProductList);

  //       const end = performance.now();
  //       this.logger.log(`updatePurchaseOrderProduct: OK, runtime=${(end - start) / 1000} seconds`);
  //       return purchaseOrderProductList;
  //     })

  //   })
  //   .catch(error => {
  //     this.logger.error(`updatePurchaseOrderProduct: error=${error.message}`);
  //     throw error;
  //   })

  // }

  // private bulkInsertPurchaseOrderProducts(purchaseOrderProductList: PurchaseOrderProduct[]): Promise<PurchaseOrderProduct[]> {
  //   const start = performance.now();
  //   this.logger.log(`bulkInsertPurchaseOrderProducts: starting process... listSize=${purchaseOrderProductList.length}`);

  //   const newPurchaseOrderProductList: PurchaseOrderProduct[] = purchaseOrderProductList.map( (value) => this.purchaseOrderProductRepository.create(value));
    
  //   try {
  //     return this.purchaseOrderProductRepository.manager.transaction( async(transactionalEntityManager) => {
        
  //       return transactionalEntityManager
  //       .createQueryBuilder()
  //       .insert()
  //       .into(PurchaseOrderProduct)
  //       .values(newPurchaseOrderProductList)
  //       .execute()
  //       .then( (insertResult: InsertResult) => {
  //         const end = performance.now();
  //         this.logger.log(`bulkInsertPurchaseOrderProducts: OK, runtime=${(end - start) / 1000} seconds, insertResult=${JSON.stringify(insertResult.raw)}`);
  //         return newPurchaseOrderProductList;
  //       })

  //     })

  //   } catch (error) {
  //     this.logger.error(`bulkInsertPurchaseOrderProducts: error=${error.message}`);
  //     throw error;
  //   }
  // }

  private updateStockMovements(dto: PurchaseOrderDto): Promise<string> {

    if(dto.status == PurchaseOrderStatusEnum.ORDER || dto.status == PurchaseOrderStatusEnum.PAID) {
      const movementDtoList = dto.productList.map( (value) => new MovementDto(MovementTypeEnum.IN, MovementReasonEnum.PURCHASE, value.qty, value.id, dto.userId, undefined, dto.id, dto.code));
      const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.MOVEMENT_UPDATE, JSON.stringify(movementDtoList));
      return this.replicationService.sendMessage(messageDto);
    }

    if(dto.status == PurchaseOrderStatusEnum.CANCELLED) {
      const jsonBasic: JsonBasic = { id: dto.id }
      const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.MOVEMENT_DELETE, JSON.stringify(jsonBasic));
      this.replicationService.sendMessage(messageDto);
    }

    throw new Error(`unexpected order status, status=${dto.status}`);
    
  }

  // private updateMovements(dto: PurchaseOrderDto): void {

  //   if(dto.status == PurchaseOrderStatusEnum.ORDER || dto.status == PurchaseOrderStatusEnum.PAID) {  
  //     // * replication data
  //     const movementDtoList = dto.productList.map( (value) => new MovementDto(MovementTypeEnum.IN, MovementReasonEnum.PURCHASE, value.qty, value.id, dto.user?.id, undefined, dto.id));
  //     const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.MOVEMENT_UPDATE, JSON.stringify(movementDtoList));
  //     this.replicationService.sendMessages([messageDto]);
  //   }

  //   if(dto.status == PurchaseOrderStatusEnum.CANCELLED) {
  //     const jsonBasic: JsonBasic = { id: dto.id }
  //     const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.MOVEMENT_DELETE, JSON.stringify(jsonBasic));
  //     this.replicationService.sendMessages([messageDto]);
  //   }
    
  // }

  private searchEntitiesByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: PurchaseOrderSearchInputDto): Promise<PurchaseOrder[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    const query = this.orderRepository.createQueryBuilder('a')
    .leftJoinAndSelect('a.company', 'c')
    .leftJoinAndSelect('a.purchaseType', 'pt')
    .leftJoinAndSelect('a.purchaseOrderProduct', 'op')
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
    
    const purchaseOrderProductDtoList: PurchaseOrderProductDto[] = purchaseOrderProductList.map( (purchaseOrderProduct: PurchaseOrderProduct) => new PurchaseOrderProductDto(purchaseOrderProduct.productId, purchaseOrderProduct.qty, purchaseOrderProduct.name, purchaseOrderProduct.cost, purchaseOrderProduct.amount, purchaseOrderProduct.comment, purchaseOrderProduct.code, purchaseOrderProduct.status) );
    const purchaseTypeDto = new PurchaseTypeDto(order.company.id, order.purchaseType.name, order.purchaseType.id);
    // const documentTypeDto = order.documentNumber ? new DocumentTypeDto(order.company.id, order.documentType.name, order.documentType.id) : undefined;

    // * format createdAt
    let createdAtFormat = moment(order.createdAt).format(DateFormatEnum.DATETIME_FORMAT);
    createdAtFormat     = moment.utc(createdAtFormat).tz(DateFormatEnum.TIME_ZONE).format(DateFormatEnum.DATETIME_FORMAT);

    // * generate order dto
    const orderDto = new PurchaseOrderDto(
      order.company.id,
      order.id,
      purchaseTypeDto.id,
      order.code,
      order.providerIdDoc,
      order.providerName,
      order.providerEmail,
      order.providerPhone,
      order.providerAddress,
      order.comment,
      order.amount,
      order.documentTypeId,
      order.documentNumber,
      order.status,
      createdAtFormat,
      order.company,
      order.user,
      purchaseTypeDto,
      purchaseOrderProductDtoList
    );

    return orderDto;
  }

  private updateProductCost(orderDto: PurchaseOrderDto, updateProductIdList: string[] = []): void {

    const productCostDtoList: ProductCostDto[] = orderDto.productList.reduce( (acc, value) => {
      if(updateProductIdList.includes(value.id)) {
        const cost = value.amount / value.qty;
        acc.push(new ProductCostDto(value.id, cost, orderDto.id, orderDto.user?.id));
      }

      return acc;
    }, []);

    if(productCostDtoList.length == 0){
      this.logger.warn('updateProductCost: not executed (empty list)');
      return;
    }

    // TODO: Descomentar cuando se ajuste la api de products
    // * replication data
    const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.PRODUCT_COST_UPDATE, JSON.stringify(productCostDtoList));
    // this.replicationService.sendMessage(messageDto)
    // .catch(error => {
    //   this.logger.error('updateProductCost: error', error);
    // })

  }
}
