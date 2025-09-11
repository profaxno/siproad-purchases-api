import { Brackets, In, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { ProductDto, ProductSearchInputDto } from './dto';
import { Product, ProductCategory } from './entities';
import { ProductCategoryService } from './product-category.service';

import { Company } from '../companies/entities/company.entity';
import { CompanyService } from '../companies/company.service';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';
import { ProcessEnum, SourceEnum } from 'src/data-transfer/enums';
import { MessageDto } from 'src/data-transfer/dto/message.dto';
import { DataReplicationService } from 'src/data-transfer/data-replication/data-replication.service';

@Injectable()
export class ProductService {

  private readonly logger = new Logger(ProductService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,
    
    @InjectRepository(Product, 'purchasesConn')
    private readonly productRepository: Repository<Product>,

    // private readonly companyService: CompanyService,
    // private readonly productCategoryService: ProductCategoryService
    
    private readonly replicationService: DataReplicationService
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  async updateBatch(dtoList: ProductDto[]): Promise<ProcessSummaryDto>{
    this.logger.warn(`updateBatch: starting process... listSize=${dtoList.length}`);
    const start = performance.now();
    
    let processResultDto: ProcessSummaryDto = new ProcessSummaryDto(dtoList.length);
    let i = 0;
    for (const dto of dtoList) {
      
      await this.update(dto)
      .then( () => {
        processResultDto.rowsOK++;
        processResultDto.detailsRowsOK.push(`(${i++}) name=${dto.name}, message=OK`);
      })
      .catch(error => {
        processResultDto.rowsKO++;
        processResultDto.detailsRowsKO.push(`(${i++}) name=${dto.name}, error=${error}`);
      })

    }
    
    const end = performance.now();
    this.logger.log(`updateBatch: executed, runtime=${(end - start) / 1000} seconds`);
    return processResultDto;
  }

  update(dto: ProductDto): Promise<ProductDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * find order
    return this.productRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: Product) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg}), the creation will be executed`);
        return this.create(dto);
      }
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: Product) => this.save(entity) ) // * update
      .then( (entity: Product) => {
        const dto = new ProductDto(entity.company.id, entity.name, entity.cost, entity.type, entity.enable4Sale, entity.id, entity.productCategory?.id, entity.code, entity.description, entity.unit, entity.price); // * generate dto
        
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

    // // * find product
    // const inputDto: SearchInputDto = new SearchInputDto(dto.id);
      
    // return this.findByValue({}, inputDto)
    // .then( (entityList: Product[]) => {

    //   // * validate
    //   if(entityList.length == 0){
    //     const msg = `product id not found, id=${dto.id}`;
    //     this.logger.warn(`update: not executed (${msg}), the creation will be executed`);
    //     return this.create(dto);
    //   }

    //   // * update
    //   const entity = entityList[0];

    //   return this.prepareEntity(entity, dto) // * prepare entity
    //   .then( (entity: Product) => this.save(entity) ) // * create/update entity
    //   .then( (entity: Product) => {

    //     const dto = new ProductDto(entity.company.id, entity.name, entity.cost, entity.type, entity.enable4Sale, entity.id, entity.productCategory?.id, entity.code, entity.description, entity.unit, entity.price); // * generate dto
        
    //     const end = performance.now();
    //     this.logger.log(`update: created OK, runtime=${(end - start) / 1000} seconds`);
    //     return dto;

    //   })
      
    // })
    // .catch(error => {
    //   this.logger.error(`update: error`, error);
    //   throw error;
    // })

  }

  create(dto: ProductDto): Promise<ProductDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.productRepository.findOne({
      where: { name: dto.name },
    })
    .then( (entity: Product) => {

      // * validate
      if(entity){
        const msg = `name already exists, name=${dto.name}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new AlreadyExistException(msg);
      }
      
      return new Product();
    })
    .then( (entity: Product) => this.prepareEntity(entity, dto) )// * prepare
    .then( (entity: Product) => this.save(entity) ) // * update
    .then( (entity: Product) => {
      const dto = new ProductDto(entity.company.id, entity.name, entity.cost, entity.type, entity.enable4Sale, entity.id, entity.productCategory?.id, entity.code, entity.description, entity.unit, entity.price); // * generate dto
      
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

    // // * find product
    // const inputDto: SearchInputDto = new SearchInputDto(dto.name);
    
    // return this.findByValue({}, inputDto, dto.companyId)
    // .then( (entityList: Product[]) => {

    //   // * validate
    //   if(entityList.length > 0){
    //     const msg = `product name already exists, name=${dto.name}`;
    //     this.logger.warn(`create: not executed (${msg})`);
    //     throw new AlreadyExistException(msg);
    //   }
      
    //   // * create
    //   const entity = new Product();
      
    //   return this.prepareEntity(entity, dto) // * prepare entity
    //   .then( (entity: Product) => this.save(entity) ) // * create/update entity
    //   .then( (entity: Product) => {
        
    //     const dto = new ProductDto(entity.company.id, entity.name, entity.cost, entity.type, entity.enable4Sale, entity.id, entity.productCategory?.id, entity.code, entity.description, entity.unit, entity.price); // * generate dto
        
    //     const end = performance.now();
    //     this.logger.log(`create: created OK, runtime=${(end - start) / 1000} seconds`);
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
    this.logger.warn(`remove: starting process... id=${id}`);
    const start = performance.now();

    return this.productRepository.findOne({
      where: { id },
    })
    .then( (entity: Product) => {

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
    .then( (entity: Product) => this.save(entity) )
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

    // // * find product
    // const inputDto: SearchInputDto = new SearchInputDto(id);
    
    // return this.findByValue({}, inputDto)
    // .then( (entityList: Product[]) => {
  
    //   // * validate
    //   if(entityList.length == 0){
    //     const msg = `product id not found, id=${id}`;
    //     this.logger.warn(`remove: not executed (${msg})`);
    //     throw new NotFoundException(msg);
    //   }
      
    //   // * delete: update field active
    //   const entity = entityList[0];
    //   entity.active = false;

    //   return this.save(entity)
    //   .then( (entity: Product) => {

    //     const end = performance.now();
    //     this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
    //     return 'deleted';
        
    //   })

    // })
    // .catch(error => {
    //   if(error instanceof NotFoundException)
    //     throw error;

    //   if(error.errno == 1217) {
    //     const msg = 'product is being used';
    //     this.logger.warn(`remove: not executed (${msg})`, error);
    //     throw new IsBeingUsedException(msg);
    //   }

    //   this.logger.error('remove: error', error);
    //   throw error;
    // })

  }

  searchByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: ProductSearchInputDto): Promise<ProductDto[]> {
    const start = performance.now();

    return this.searchEntitiesByValues(companyId, paginationDto, inputDto)
    .then( (entityList: Product[]) => entityList.map( (entity) => new ProductDto(entity.company.id, entity.name, entity.cost, entity.type, entity.enable4Sale, entity.id, entity.productCategory?.id, entity.code, entity.description, entity.unit, entity.price) ) )
    .then( (dtoList: ProductDto[]) => {
      
      if(dtoList.length == 0){
        const msg = `products not found, inputDto=${JSON.stringify(inputDto)}`;
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

  findByIds(paginationDto: SearchPaginationDto, idList: string[]): Promise<Product[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;
    
    return this.productRepository.find({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        id: In(idList),
        active: true
      }
    })
    
  }

  // updateProductCost(id: string, cost: number): Promise<ProductDto> {
  //   this.logger.warn(`updateProductCost: starting process... id=${id}`);
  //   const start = performance.now();

  //   // * find order
  //   return this.productRepository.findOne({
  //     where: { id },
  //   })
  //   .then( (entity: Product) => {

  //     // * validate
  //     if(!entity){
  //       const msg = `entity not found, id=${id}`;
  //       this.logger.warn(`updateProductCost: not executed (${msg})`);
  //       throw new NotFoundException(msg);
  //     }
      
  //     // * prepare entity
  //     entity.cost = cost;

  //     return this.save(entity) // * update
  //     .then( (entity: Product) => {
  //       const dto = new ProductDto(entity.company.id, entity.name, entity.cost, entity.type, entity.enable4Sale, entity.id, entity.productCategory?.id, entity.code, entity.description, entity.unit, entity.price); // * generate dto
        
  //       // * replication data
  //       const messageDto = new MessageDto(SourceEnum.API_PURCHASES, ProcessEnum.PRODUCT_UPDATE, JSON.stringify([dto]));
  //       this.replicationService.sendMessages([messageDto]);

  //       const end = performance.now();
  //       this.logger.log(`updateProductCost: executed, runtime=${(end - start) / 1000} seconds`);
  //       return dto;
  //     })

  //   })
  //   .catch(error => {
  //     if(error instanceof NotFoundException)
  //       throw error;

  //     this.logger.error(`updateProductCost: error=${error.message}`);
  //     throw error;
  //   })

  // }

  private prepareEntity(entity: Product, dto: ProductDto): Promise<Product> {
    
    try {
      const company = new Company();
      company.id = dto.companyId;

      const productCategory = new ProductCategory();
      productCategory.id = dto.productCategoryId;

      // * prepare entity
      entity.id           = dto.id ? dto.id : undefined;
      entity.company      = company;
      entity.name         = dto.name.toUpperCase();
      entity.code         = dto.code ? dto.code.toUpperCase() : undefined;
      entity.description  = dto.description ? dto.description.toUpperCase() : undefined;
      entity.unit         = dto.unit ? dto.unit.toUpperCase() : undefined;
      entity.cost         = dto.cost;
      entity.price        = dto.price;
      entity.type         = dto.type;
      entity.enable4Sale  = dto.enable4Sale;
      entity.productCategory = dto.productCategoryId ? productCategory : undefined;

      return Promise.resolve(entity);

    } catch( error ) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  private save(entity: Product): Promise<Product> {
    const start = performance.now();

    const newEntity: Product = this.productRepository.create(entity);

    return this.productRepository.save(newEntity)
    .then( (entity: Product) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  private searchEntitiesByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: ProductSearchInputDto): Promise<Product[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    const query = this.productRepository.createQueryBuilder('p')
    .leftJoinAndSelect('p.company', 'c')
    .where('p.companyId = :companyId', { companyId })
    .andWhere('p.active = :active', { active: true });

    if(inputDto.nameCodeList.length > 0) {
      query.andWhere(
        new Brackets(qb => {

          inputDto.nameCodeList.forEach((value, index) => {
            const formatted = `%${value.replace(' ', '%')}%`; // const formatted = `%${value.replace(/ /g, '%')}%`;
            if (index === 0) {
              qb.where('p.name LIKE :name0 OR p.code LIKE :code0', {
                [`name0`]: formatted,
                [`code0`]: formatted,
              })
            } else {
              qb.orWhere('p.name LIKE :name' + index + ' OR p.code LIKE :code' + index, {
                [`name${index}`]: formatted,
                [`code${index}`]: formatted,
              })
            }
          })

        })
      )
    }

    if (inputDto.productTypeList?.length > 0) {
      query.andWhere('p.type IN (:...productTypeList)', { productTypeList: inputDto.productTypeList});
    }

    if(inputDto.productCategoryId) {
      query.andWhere('p.productCategoryId = :productCategoryId', { productCategoryId: inputDto.productCategoryId });
    }

    console.log('SQL:', query.getSql());
    console.log('Parámetros:', query.getParameters());

    return query
    .skip((page - 1) * limit)
    .take(limit)
    .getMany();
  }

  // findByValue(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<Product[]> {
  //   const {page=1, limit=this.dbDefaultLimit} = paginationDto;

  //   // * search by id or partial value
  //   const value = inputDto.search;
  //   if(value) {
  //     const whereById     = { id: value, active: true };
  //     const whereByValue  = { company: { id: companyId }, name: value, active: true };
  //     const where = isUUID(value) ? whereById : whereByValue;

  //     return this.productRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: where
  //     })
  //   }

  //   // * search by value list
  //   if(inputDto.searchList?.length > 0) {
  //     return this.productRepository.find({
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

  //   // * search by id list
  //   if(inputDto.idList?.length > 0) {
  //     return this.productRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: {
  //         id: In(inputDto.idList),
  //         active: true
  //       }
  //     })
  //   }

  //   // * search all
  //   return this.productRepository.find({
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

  // private prepareEntity(entity: Product, dto: ProductDto): Promise<Product> {

  //   // * find company
  //   const inputDto: SearchInputDto = new SearchInputDto(dto.companyId);
    
  //   return this.companyService.findByValue({}, inputDto)
  //   .then( (companyList: Company[]) => {

  //     if(companyList.length == 0){
  //       const msg = `company not found, id=${dto.companyId}`;
  //       this.logger.error(`prepareEntity: not executed (${msg})`);
  //       throw new NotFoundException(msg);
  //     }

  //     // * find product type
  //     const inputDto: SearchInputDto = new SearchInputDto(dto.productCategoryId);

  //     return ( dto.productCategoryId ? this.productCategoryService.findByValue({}, inputDto, dto.companyId) : Promise.resolve([]) )
  //     .then( (productCategoryList: ProductCategory[]) => {
        
  //       // * prepare entity
  //       entity.id           = dto.id ? dto.id : null;
  //       entity.company      = companyList[0];
  //       entity.name         = dto.name.toUpperCase();
  //       entity.code         = dto.code ? dto.code.toUpperCase() : null;
  //       entity.description  = dto.description ? dto.description.toUpperCase() : null;
  //       entity.unit         = dto.unit ? dto.unit.toUpperCase() : null;
  //       entity.cost         = dto.cost;
  //       entity.price        = dto.price;
  //       entity.type         = dto.type;
  //       entity.enable4Sale  = dto.enable4Sale;
  //       entity.productCategory  = productCategoryList.length > 0 ? productCategoryList[0] : null;

  //       return entity;
  //     })
  //     .catch( error => {
  //       this.logger.error(`prepareEntity: error`, error);
  //       throw error;
  //     })

  //   })
    
  // }

  // private findProductsByCategory(paginationDto: SearchPaginationDto, companyId: string, categoryId: string): Promise<Product[]> {
  //   const {page=1, limit=this.dbDefaultLimit} = paginationDto;
    
  //   return this.productRepository.find({
  //     take: limit,
  //     skip: (page - 1) * limit,
  //     where: {
  //       company: { 
  //         id: companyId 
  //       },
  //       productType: {
  //         id: categoryId
  //       },
  //       active: true,
  //     }
  //   })
    
  // }

}
