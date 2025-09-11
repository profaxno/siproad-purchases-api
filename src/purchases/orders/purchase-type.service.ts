import { Repository } from 'typeorm';

import { SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';

import { PurchaseTypeDto, PurchaseTypeSearchInputDto } from './dto';
import { PurchaseType } from './entities';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class PurchaseTypeService {

  private readonly logger = new Logger(PurchaseTypeService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,

    @InjectRepository(PurchaseType, 'purchasesConn')
    private readonly purchaseTypeRepository: Repository<PurchaseType>,
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  update(dto: PurchaseTypeDto): Promise<PurchaseTypeDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.purchaseTypeRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: PurchaseType) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg}), the creation will be executed`);
        return this.create(dto);
      }
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: PurchaseType) => this.save(entity) ) // * update
      .then( (entity: PurchaseType) => {
        const dto = new PurchaseTypeDto(entity.company.id, entity.name, entity.id);
        
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

  }

  create(dto: PurchaseTypeDto): Promise<PurchaseTypeDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.purchaseTypeRepository.findOne({
      where: { name: dto.name },
    })
    .then( (entity: PurchaseType) => {

      // * validate
      if(entity){
        const msg = `name already exists, name=${dto.name}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new AlreadyExistException(msg);
      }
      
      return new PurchaseType();
    })
    .then( (entity: PurchaseType) => this.prepareEntity(entity, dto) )// * prepare
    .then( (entity: PurchaseType) => this.save(entity) ) // * update
    .then( (entity: PurchaseType) => {
      const dto = new PurchaseTypeDto(entity.company.id, entity.name, entity.id);
      
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
    
  }

  remove(id: string): Promise<string> {
    this.logger.log(`remove: starting process... id=${id}`);
    const start = performance.now();

    // * find order
    // const inputDto: SearchInputDto = new SearchInputDto(id);
    
    return this.purchaseTypeRepository.findOne({
      where: { id },
    })
    .then( (entity: PurchaseType) => {

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
    .then( (entity: PurchaseType) => this.save(entity) )
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

  }

  searchByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: PurchaseTypeSearchInputDto): Promise<PurchaseTypeDto[]> {
    const start = performance.now();

    return this.searchEntitiesByValues(companyId, paginationDto, inputDto)
    .then( (entityList: PurchaseType[]) => entityList.map( (entity) => new PurchaseTypeDto(entity.company.id, entity.name, entity.id) ) )
    .then( (dtoList: PurchaseTypeDto[]) => {
      
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

  private prepareEntity(entity: PurchaseType, dto: PurchaseTypeDto): Promise<PurchaseType> {
  
    try {
      const company = new Company();
      company.id = dto.companyId;

      entity.id     = dto.id ? dto.id : undefined;
      entity.company= company;
      entity.name   = dto.name.toUpperCase();

      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  private save(entity: PurchaseType): Promise<PurchaseType> {
    const start = performance.now();

    const newEntity: PurchaseType = this.purchaseTypeRepository.create(entity);

    return this.purchaseTypeRepository.save(newEntity)
    .then( (entity: PurchaseType) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }
  
  private searchEntitiesByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: PurchaseTypeSearchInputDto): Promise<PurchaseType[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    const query = this.purchaseTypeRepository.createQueryBuilder('a')
    .leftJoinAndSelect('a.company', 'c')
    .where('a.companyId = :companyId', { companyId })
    .andWhere('a.active = :active', { active: true });

    if(inputDto.name) {
      const formatted = `%${inputDto.name?.toLowerCase().replace(' ', '%')}%`;
      query.andWhere('a.name LIKE :name', { name: formatted });
    }

    return query
    .skip((page - 1) * limit)
    .take(limit)
    .getMany();
  }

}
