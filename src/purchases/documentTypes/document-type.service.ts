import { Repository } from 'typeorm';

import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';

import { DocumentTypeDto, DocumentTypeSearchInputDto } from './dto';
import { DocumentType } from './entities/document-type.entity';

import { Company } from '../companies/entities/company.entity';
import { MessageDto } from 'src/data-transfer/dto/message.dto';
import { ProcessEnum, SourceEnum } from 'src/data-transfer/enums';
import { DataReplicationService } from 'src/data-transfer/data-replication/data-replication.service';
import { JsonBasic } from 'src/data-transfer/interface/json-basic.interface';

@Injectable()
export class DocumentTypeService {

  private readonly logger = new Logger(DocumentTypeService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,

    @InjectRepository(DocumentType, 'purchasesConn')
    private readonly documentTypeRepository: Repository<DocumentType>,
    private readonly replicationService: DataReplicationService
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }

  async updateBatch(dtoList: DocumentTypeDto[]): Promise<ProcessSummaryDto>{
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

  update(dto: DocumentTypeDto): Promise<DocumentTypeDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.documentTypeRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: DocumentType) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg}), the creation will be executed`);
        return this.create(dto);
      }
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: DocumentType) => this.save(entity) ) // * update
      .then( (entity: DocumentType) => {
        const dto = new DocumentTypeDto(entity.company.id, entity.name, entity.id);
  
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

  create(dto: DocumentTypeDto): Promise<DocumentTypeDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    // * create
    return this.documentTypeRepository.findOne({
      where: { name: dto.name },
    })
    .then( (entity: DocumentType) => {

      // * validate
      if(entity){
        const msg = `name already exists, name=${dto.name}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new AlreadyExistException(msg);
      }
      
      return new DocumentType();
    })
    .then( (entity: DocumentType) => this.prepareEntity(entity, dto) )// * prepare
    .then( (entity: DocumentType) => this.save(entity) ) // * update
    .then( (entity: DocumentType) => {
      const dto = new DocumentTypeDto(entity.company.id, entity.name, entity.id);

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

    return this.documentTypeRepository.findOne({
      where: { id },
    })
    .then( (entity: DocumentType) => {

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
    .then( (entity: DocumentType) => this.save(entity) )
    .then( (entity: DocumentType) => {
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

  searchByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: DocumentTypeSearchInputDto): Promise<DocumentTypeDto[]> {
    const start = performance.now();

    return this.searchEntitiesByValues(companyId, paginationDto, inputDto)
    .then( (entityList: DocumentType[]) => entityList.map( (entity) => new DocumentTypeDto(entity.company.id, entity.name, entity.id) ) )
    .then( (dtoList: DocumentTypeDto[]) => {
      
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
  
  private prepareEntity(entity: DocumentType, dto: DocumentTypeDto): Promise<DocumentType> {
  
    try {
      const company = new Company();
      company.id = dto.companyId;

      entity.id           = dto.id ? dto.id : undefined;
      entity.company      = company;
      entity.name         = dto.name.toUpperCase();

      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  private save(entity: DocumentType): Promise<DocumentType> {
    const start = performance.now();

    const newEntity: DocumentType = this.documentTypeRepository.create(entity);

    return this.documentTypeRepository.save(newEntity)
    .then( (entity: DocumentType) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }

  private searchEntitiesByValues(companyId: string, paginationDto: SearchPaginationDto, inputDto: DocumentTypeSearchInputDto): Promise<DocumentType[]> {
    const {page=1, limit=this.dbDefaultLimit} = paginationDto;

    const query = this.documentTypeRepository.createQueryBuilder('a')
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
