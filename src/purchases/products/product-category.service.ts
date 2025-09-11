import { In, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Company } from '../companies/entities/company.entity';
import { CompanyService } from '../companies/company.service';

import { ProductCategoryDto } from './dto';
import { ProductCategory } from './entities';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';

@Injectable()
export class ProductCategoryService {

  private readonly logger = new Logger(ProductCategoryService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,

    @InjectRepository(ProductCategory, 'purchasesConn')
    private readonly productCategoryRepository: Repository<ProductCategory>,

    private readonly companyService: CompanyService
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }
  
  async updateBatch(dtoList: ProductCategoryDto[]): Promise<ProcessSummaryDto>{
    this.logger.warn(`updateBatch: starting process... listSize=${dtoList.length}`);
    const start = performance.now();
    
    let processSummaryDto: ProcessSummaryDto = new ProcessSummaryDto(dtoList.length);
    let i = 0;
    for (const dto of dtoList) {
      
      await this.update(dto)
      .then( () => {
        processSummaryDto.rowsOK++;
        processSummaryDto.detailsRowsOK.push(`(${i++}) name=${dto.name}, message=OK`);
      })
      .catch(error => {
        processSummaryDto.rowsKO++;
        processSummaryDto.detailsRowsKO.push(`(${i++}) name=${dto.name}, error=${error}`);
      })

    }
    
    const end = performance.now();
    this.logger.log(`updateBatch: executed, runtime=${(end - start) / 1000} seconds`);
    return processSummaryDto;
  }

  update(dto: ProductCategoryDto): Promise<ProductCategoryDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();
    
    return this.productCategoryRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: ProductCategory) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg}), the creation will be executed`);
        return this.create(dto);
      }
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: ProductCategory) => this.save(entity) ) // * update
      .then( (entity: ProductCategory) => {
        const dto = new ProductCategoryDto(entity.company.id, entity.name, entity.id); // * map to dto
        
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

    // // * find productCategory
    // const inputDto: SearchInputDto = new SearchInputDto(dto.id);
      
    // return this.findByValue({}, inputDto)
    // .then( (entityList: ProductCategory[]) => {

    //   // * validate
    //   if(entityList.length == 0){
    //     this.logger.warn(`update: productCategory not found, id=${dto.id}`);
    //     return this.create(dto); // * create, if the dto has an id and the object is not found, the request may possibly come from data replication
    //   }

    //   // * update
    //   const entity = entityList[0];
              
    //   return this.prepareEntity(entity, dto) // * prepare
    //   .then( (entity: ProductCategory) => this.save(entity) ) // * update
    //   .then( (entity: ProductCategory) => {
    //     const dto = new ProductCategoryDto(entity.company.id, entity.name, entity.id); // * map to dto

    //     const end = performance.now();
    //     this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
    //     return dto;
    //   })
      
    // })
    // .catch(error => {
    //   if(error instanceof NotFoundException)
    //     throw error;

    //   this.logger.error(`update: error`, error);
    //   throw error;
    // })

  }

  create(dto: ProductCategoryDto): Promise<ProductCategoryDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.productCategoryRepository.findOne({
      where: { name: dto.name },
    })
    .then( (entity: ProductCategory) => {

      // * validate
      if(entity){
        const msg = `name already exists, name=${dto.name}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new AlreadyExistException(msg);
      }
      
      return new ProductCategory();
    })
    .then( (entity: ProductCategory) => this.prepareEntity(entity, dto) )// * prepare
    .then( (entity: ProductCategory) => this.save(entity) ) // * update
    .then( (entity: ProductCategory) => {
      const dto = new ProductCategoryDto(entity.company.id, entity.name, entity.id); // * map to dto 
      
      const end = performance.now();
      this.logger.log(`create: executed, runtime=${(end - start) / 1000} seconds`);
      return dto;
    })
    .catch(error => {
      if(error instanceof NotFoundException || error instanceof AlreadyExistException)
        throw error;

      this.logger.error(`create: error=${error.message}`);
      throw error;
    })

    // // * find productCategory
    // const inputDto: SearchInputDto = new SearchInputDto(undefined, [dto.name]);
      
    // return this.findByValue({}, inputDto, dto.companyId)
    // .then( (entityList: ProductCategory[]) => {

    //   // * validate
    //   if(entityList.length > 0){
    //     const msg = `productCategory already exists, name=${dto.name}`;
    //     this.logger.warn(`create: not executed (${msg})`);
    //     throw new AlreadyExistException(msg);
    //   }

    //   // * create
    //   const entity = new ProductCategory();
      
    //   return this.prepareEntity(entity, dto) // * prepare
    //   .then( (entity: ProductCategory) => this.save(entity) ) // * update
    //   .then( (entity: ProductCategory) => {
    //     const dto = new ProductCategoryDto(entity.company.id, entity.name, entity.id); // * map to dto 

    //     const end = performance.now();
    //     this.logger.log(`create: OK, runtime=${(end - start) / 1000} seconds`);
    //     return dto;
    //   })

    // })
    // .catch(error => {
    //   if(error instanceof NotFoundException || error instanceof AlreadyExistException)
    //     throw error;

    //   this.logger.error(`create: error`, error);
    //   throw error;
    // })

  }  

  async removeBatch(idList: string[]): Promise<ProcessSummaryDto>{
    this.logger.warn(`removeBatch: starting process... listSize=${idList.length}`);
    const start = performance.now();
    
    let processSummaryDto: ProcessSummaryDto = new ProcessSummaryDto(idList.length);
    let i = 0;
    for (const id of idList) {
      
      await this.remove(id)
      .then( () => {
        processSummaryDto.rowsOK++;
        processSummaryDto.detailsRowsOK.push(`(${i++}) id=${id}, message=OK`);
      })
      .catch(error => {
        processSummaryDto.rowsKO++;
        processSummaryDto.detailsRowsKO.push(`(${i++}) id=${id}, error=${error}`);
      })

    }
    
    const end = performance.now();
    this.logger.log(`removeBatch: executed, runtime=${(end - start) / 1000} seconds`);
    return processSummaryDto;
  }

  remove(id: string): Promise<string> {
    this.logger.log(`remove: starting process... id=${id}`);
    const start = performance.now();

    return this.productCategoryRepository.findOne({
      where: { id },
    })
    .then( (entity: ProductCategory) => {

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
    .then( (entity: ProductCategory) => this.save(entity) )
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

    // // * find productCategory
    // const inputDto: SearchInputDto = new SearchInputDto(id);
    
    // return this.findByValue({}, inputDto)
    // .then( (entityList: ProductCategory[]) => {
      
    //   if(entityList.length == 0){
    //     const msg = `productCategory not found, id=${id}`;
    //     this.logger.warn(`remove: not executed (${msg})`);
    //     throw new NotFoundException(msg);
    //   }

    //   // * delete
    //   return this.productCategoryRepository.delete(id)
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
    //     const msg = 'productCategory is being used';
    //     this.logger.warn(`removeProduct: not executed (${msg})`, error);
    //     throw new IsBeingUsedException(msg);
    //   }

    //   this.logger.error('remove: error', error);
    //   throw error;
    // })

  }

  // find(companyId: string, paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<ProductCategoryDto[]> {
  //   const start = performance.now();

  //   return this.findByValue(paginationDto, inputDto, companyId)
  //   .then( (entityList: ProductCategory[]) => entityList.map( (entity: ProductCategory) => new ProductCategoryDto(entity.company.id, entity.name, entity.id) ) )// * map entities to DTOs
  //   .then( (dtoList: ProductCategoryDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `productCategorys not found`;
  //       this.logger.warn(`find: ${msg}`);
  //       throw new NotFoundException(msg);
  //     }

  //     const end = performance.now();
  //     this.logger.log(`find: executed, runtime=${(end - start) / 1000} seconds`);
  //     return dtoList;
  //   })
  //   .catch(error => {
  //     if(error instanceof NotFoundException)
  //       throw error;

  //     this.logger.error(`find: error`, error);
  //     throw error;
  //   })

  // }

  // findOneById(id: string, companyId?: string): Promise<ProductCategoryDto[]> {
  //   const start = performance.now();

  //   const inputDto: SearchInputDto = new SearchInputDto(id);
    
  //   return this.findByValue({}, inputDto, companyId)
  //   .then( (entityList: ProductCategory[]) => entityList.map( (entity: ProductCategory) => new ProductCategoryDto(entity.company.id, entity.name, entity.id) ) )// * map entities to DTOs
  //   .then( (dtoList: ProductCategoryDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `productCategory not found, id=${id}`;
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

  // private findByValue(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<ProductCategory[]> {
  //   const {page=1, limit=this.dbDefaultLimit} = paginationDto;

  //   // * search by id or partial value
  //   const value = inputDto.search;
  //   if(value) {
  //     const whereById     = { id: value };
  //     const whereByValue  = { company: { id: companyId}, name: value, active: true };
  //     const where = isUUID(value) ? whereById : whereByValue;

  //     return this.productCategoryRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: where
  //     })
  //   }

  //   // * search by value list
  //   if(inputDto.searchList?.length > 0) {
  //     return this.productCategoryRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: {
  //         company: {
  //           id: companyId
  //         },
  //         name: Raw( (fieldName) => inputDto.searchList.map(value => `${fieldName} LIKE '%${value.replace(' ', '%')}%'`).join(' OR ') ),
  //         // name: In(inputDto.searchList),
  //         active: true
  //       }
  //     })
  //   }

  //   // * search all
  //   return this.productCategoryRepository.find({
  //     take: limit,
  //     skip: (page - 1) * limit,
  //     where: { 
  //       company: {
  //         id: companyId
  //       },
  //       active: true
  //     }
  //   })
    
  // }

  private prepareEntity(entity: ProductCategory, dto: ProductCategoryDto): Promise<ProductCategory> {
    
    const company = new Company();
    company.id = dto.companyId;
  
    try {
      entity.id     = dto.id ? dto.id : undefined;
      entity.company= company;
      entity.name   = dto.name.toUpperCase();
    
      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
  }

  private save(entity: ProductCategory): Promise<ProductCategory> {
    const start = performance.now();

    const newEntity: ProductCategory = this.productCategoryRepository.create(entity);

    return this.productCategoryRepository.save(newEntity)
    .then( (entity: ProductCategory) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }
  
}
