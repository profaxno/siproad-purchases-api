import { In, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { CompanyDto } from './dto/company.dto';
import { Company } from './entities/company.entity';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';

@Injectable()
export class CompanyService {

  private readonly logger = new Logger(CompanyService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,

    @InjectRepository(Company, 'purchasesConn')
    private readonly companyRepository: Repository<Company>,
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  async updateBatch(dtoList: CompanyDto[]): Promise<ProcessSummaryDto>{
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

  update(dto: CompanyDto): Promise<CompanyDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.companyRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: Company) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg}), the creation will be executed`);
        return this.create(dto);
      }
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: Company) => this.save(entity) ) // * update
      .then( (entity: Company) => {
        const dto = new CompanyDto(entity.name, entity.id); // * map to dto
        
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

    // const inputDto: SearchInputDto = new SearchInputDto(dto.id);
    
    // return this.findByValue({}, inputDto)
    // .then( (entityList: Company[]) => {

    //   // * validate
    //   if(entityList.length == 0){
    //     this.logger.warn(`update: company not found, id=${dto.id}`);
    //     return this.create(dto); // * create, if the dto has an id and the object is not found, the request may possibly come from data replication
    //   }

    //   // * update
    //   let entity = entityList[0];
    //   entity.name = dto.name.toUpperCase();
      
    //   return this.save(entity)
    //   .then( (entity: Company) => {
    //     const dto = new CompanyDto(entity.name, entity.id); // * map to dto

    //     const end = performance.now();
    //     this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
    //     return dto;
    //   })
      
    // })
    // .catch(error => {
    //   if(error instanceof AlreadyExistException)
    //     throw error;
      
    //   this.logger.error(`update: error`, error);
    //   throw error;
    // })

  }

  create(dto: CompanyDto): Promise<CompanyDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.companyRepository.findOne({
      where: { name: dto.name },
    })
    .then( (entity: Company) => {

      // * validate
      if(entity){
        const msg = `name already exists, name=${dto.name}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new AlreadyExistException(msg);
      }
      
      return new Company();
    })
    .then( (entity: Company) => this.prepareEntity(entity, dto) )// * prepare
    .then( (entity: Company) => this.save(entity) ) // * update
    .then( (entity: Company) => {
      const dto = new CompanyDto(entity.name, entity.id); // * map to dto
      
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

    // // * find company
    // const inputDto: SearchInputDto = new SearchInputDto(undefined, [dto.name]);
    
    // return this.findByValue({}, inputDto)
    // .then( (entityList: Company[]) => {

    //   // * validate
    //   if(entityList.length > 0){
    //     const msg = `company already exists, name=${dto.name}`;
    //     this.logger.warn(`create: not executed (${msg})`);
    //     throw new AlreadyExistException(msg);
    //   }

    //   // * create
    //   let entity = new Company();
    //   entity.id = dto.id ? dto.id : undefined;
    //   entity.name = dto.name.toUpperCase()
      
    //   return this.save(entity)
    //   .then( (entity: Company) => {
    //     const dto = new CompanyDto(entity.name, entity.id); // * map to dto

    //     const end = performance.now();
    //     this.logger.log(`create: OK, runtime=${(end - start) / 1000} seconds`);
    //     return dto;
    //   })

    // })
    // .catch(error => {
    //   if(error instanceof AlreadyExistException)
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

    return this.companyRepository.findOne({
      where: { id },
    })
    .then( (entity: Company) => {

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
    .then( (entity: Company) => this.save(entity) )
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

    // const inputDto: SearchInputDto = new SearchInputDto(id);
    
    // return this.findByValue({}, inputDto)
    // .then( (entityList: Company[]) => {
      
    //   if(entityList.length == 0){
    //     const msg = `company not found, id=${id}`;
    //     this.logger.warn(`remove: not executed (${msg})`);
    //     throw new NotFoundException(msg);
    //   }

    //   // * delete
    //   return this.companyRepository.delete(id)
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
    //     const msg = 'company is being used';
    //     this.logger.warn(`remove: not executed (${msg})`, error);
    //     throw new IsBeingUsedException(msg);
    //   }

    //   this.logger.error('remove: error', error);
    //   throw error;
    // })

  }

  // find(paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<CompanyDto[]> {
  //   const start = performance.now();

  //   return this.findByValue(paginationDto, inputDto)
  //   .then( (entityList: Company[]) => entityList.map( (entity: Company) => new CompanyDto(entity.name, entity.id) ) ) // * map entities to DTOs
  //   .then( (dtoList: CompanyDto[]) => {

  //     if(dtoList.length == 0){
  //       const msg = `companies not found`;
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

  // findOneById(id: string): Promise<CompanyDto[]> {
  //   const start = performance.now();

  //   const inputDto: SearchInputDto = new SearchInputDto(id);
    
  //   return this.findByValue({}, inputDto)
  //   .then( (entityList: Company[]) => entityList.map( (entity: Company) => new CompanyDto(entity.name, entity.id) ) ) // * map entities to DTOs
  //   .then( (dtoList: CompanyDto[]) => {

  //     if(dtoList.length == 0){
  //       const msg = `company not found, id=${id}`;
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

  private prepareEntity(entity: Company, dto: CompanyDto): Promise<Company> {
    
    try {
      entity.id   = dto.id ? dto.id : undefined;
      entity.name = dto.name.toUpperCase();
      
      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  private save(entity: Company): Promise<Company> {
    const start = performance.now();

    const newEntity: Company = this.companyRepository.create(entity);

    return this.companyRepository.save(newEntity)
    .then( (entity: Company) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  // findByValue(paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<Company[]> {
  //   const {page=1, limit=this.dbDefaultLimit} = paginationDto;

  //   // * search by id or partial value
  //   const value = inputDto.search;
  //   if(value) {
  //     const whereById     = { id: value, active: true };
  //     const whereByValue  = { name: value, active: true };
  //     const where = isUUID(value) ? whereById : whereByValue;

  //     return this.companyRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: where
  //     })
  //   }

  //   // * search by value list
  //   if(inputDto.searchList?.length > 0) {
  //     return this.companyRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: {
  //         name: Raw( (fieldName) => inputDto.searchList.map(value => `${fieldName} LIKE '%${value.replace(' ', '%')}%'`).join(' OR ') ),
  //         // name: In(inputDto.searchList),
  //         active: true
  //       }
  //     })
  //   }

  //   // * search all
  //   return this.companyRepository.find({
  //     take: limit,
  //     skip: (page - 1) * limit,
  //     where: { active: true }
  //   })
    
  // }
}
