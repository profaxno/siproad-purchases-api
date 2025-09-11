import { In, InsertResult, Like, Raw, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { UserDto } from './dto/user.dto';
import { User } from './entities/user.entity';
import { UserStatusEnum } from './enums/user-status.enum';

import { Company } from '../companies/entities/company.entity';
import { CompanyService } from '../companies/company.service';

import { AlreadyExistException, IsBeingUsedException } from '../../common/exceptions/common.exception';

@Injectable()
export class UserService {

  private readonly logger = new Logger(UserService.name);

  private dbDefaultLimit = 1000;

  constructor(
    private readonly ConfigService: ConfigService,

    @InjectRepository(User, 'purchasesConn')
    private readonly userRepository: Repository<User>,

    private readonly companyService: CompanyService
    
  ){
    this.dbDefaultLimit = this.ConfigService.get("dbDefaultLimit");
  }
  
  async updateBatch(dtoList: UserDto[]): Promise<ProcessSummaryDto>{
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

  update(dto: UserDto): Promise<UserDto> {
    if(!dto.id)
      return this.create(dto); // * create
    
    this.logger.warn(`update: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.userRepository.findOne({
      where: { id: dto.id },
    })
    .then( (entity: User) => {

      // * validate
      if(!entity){
        const msg = `entity not found, id=${dto.id}`;
        this.logger.warn(`update: not executed (${msg}), the creation will be executed`);
        return this.create(dto);
      }
      
      return this.prepareEntity(entity, dto) // * prepare
      .then( (entity: User) => this.save(entity) ) // * update
      .then( (entity: User) => {
        const dto = new UserDto(entity.company.id, entity.name, entity.email, entity.id, entity.status);
        
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

    // // * find user
    // const inputDto: SearchInputDto = new SearchInputDto(dto.id);
      
    // return this.findByValue({}, inputDto)
    // .then( (entityList: User[]) => {

    //   // * validate
    //   if(entityList.length == 0){
    //     this.logger.warn(`update: user not found, id=${dto.id}`);
    //     return this.create(dto); // * create, if the dto has an id and the object is not found, the request may possibly come from data replication
    //   }
      
    //   // * update
    //   const entity = entityList[0];

    //   return this.prepareEntity(entity, dto) // * prepare
    //   .then( (entity: User) => this.save(entity) ) // * update
    //   .then( (entity: User) => {
    //     dto = new UserDto(entity.company.id, entity.name, entity.email, entity.id, entity.status);
    //     // return this.updateUserRole(entity, dto.roleList)
    //     // .then( (userRoleList: UserRole[]) => this.generateUserWithRoleList(entity, userRoleList) )
    //     // .then( (dto: UserDto) => {

    //     //   const end = performance.now();
    //     //   this.logger.log(`update: executed, runtime=${(end - start) / 1000} seconds`);
    //     //   return dto;
    //     // })

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

  create(dto: UserDto): Promise<UserDto> {
    this.logger.warn(`create: starting process... dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.userRepository.findOne({
      where: { name: dto.name },
    })
    .then( (entity: User) => {

      // * validate
      if(entity){
        const msg = `name already exists, name=${dto.name}`;
        this.logger.warn(`create: not executed (${msg})`);
        throw new AlreadyExistException(msg);
      }
      
      return new User();
    })
    .then( (entity: User) => this.prepareEntity(entity, dto) )// * prepare
    .then( (entity: User) => this.save(entity) ) // * update
    .then( (entity: User) => {
      const dto = new UserDto(entity.company.id, entity.name, entity.email, entity.id, entity.status);
      
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

    // // * find user
    // const inputDto: SearchInputDto = new SearchInputDto(undefined, [dto.email]);
      
    // return this.findByValue({}, inputDto, dto.companyId)
    // .then( (entityList: User[]) => {

    //   // * validate
    //   if(entityList.length > 0){
    //     const msg = `user already exists, email=${dto.email}`;
    //     this.logger.warn(`create: not executed (${msg})`);
    //     throw new AlreadyExistException(msg);
    //   }

    //   // * create
    //   const entity = new User();

    //   return this.prepareEntity(entity, dto) // * prepare
    //   .then( (entity: User) => this.save(entity) ) // * update
    //   .then( (entity: User) => {
    //     dto = new UserDto(entity.company.id, entity.name, entity.email, entity.id, entity.status);
    //     // return this.updateUserRole(entity, dto.roleList)
    //     // .then( (userRoleList: UserRole[]) => this.generateUserWithRoleList(entity, userRoleList) )
    //     // .then( (dto: UserDto) => {

    //     //   const end = performance.now();
    //     //   this.logger.log(`create: executed, runtime=${(end - start) / 1000} seconds`);
    //     //   return dto;
    //     // })

    //     const end = performance.now();
    //     this.logger.log(`create: executed, runtime=${(end - start) / 1000} seconds`);
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

  // find(companyId: string, paginationDto: SearchPaginationDto, inputDto: SearchInputDto): Promise<UserDto[]> {
  //   const start = performance.now();

  //   return this.findByValue(paginationDto, inputDto, companyId)
  //   .then( (entityList: User[]) => entityList.map( (entity: User) => new UserDto(entity.company.id, entity.name, entity.email, entity.id, entity.status) ) )// * map entities to DTOs
  //   .then( (dtoList: UserDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `users not found`;
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

  // findOneById(id: string, companyId?: string): Promise<UserDto[]> {
  //   const start = performance.now();

  //   const inputDto: SearchInputDto = new SearchInputDto(id);
    
  //   return this.findByValue({}, inputDto, companyId)
  //   .then( (entityList: User[]) => entityList.map( (entity: User) => new UserDto(entity.company.id, entity.name, entity.email, entity.id, entity.status) ) )// * map entities to DTOs
  //   .then( (dtoList: UserDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `user not found, id=${id}`;
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

    return this.userRepository.findOne({
      where: { id },
    })
    .then( (entity: User) => {

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
    .then( (entity: User) => this.save(entity) )
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

    // // * find user
    // const inputDto: SearchInputDto = new SearchInputDto(id);
    
    // return this.findByValue({}, inputDto)
    // .then( (entityList: User[]) => {
      
    //   if(entityList.length == 0){
    //     const msg = `user not found, id=${id}`;
    //     this.logger.warn(`remove: not executed (${msg})`);
    //     throw new NotFoundException(msg);
    //   }

    //   // * prepare entity
    //   const entity = entityList[0];
    //   entity.active = false;

    //   // * delete: update field active
    //   return this.save(entity)
    //   .then( () => {

    //     const end = performance.now();
    //     this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
    //     return 'deleted';
    //   })

    //   // // * delete
    //   // return this.userRepository.delete(id)
    //   // .then( () => {
    //   //   const end = performance.now();
    //   //   this.logger.log(`remove: OK, runtime=${(end - start) / 1000} seconds`);
    //   //   return 'deleted';
    //   // })

    // })
    // .catch(error => {
    //   if(error instanceof NotFoundException)
    //     throw error;

    //   if(error.errno == 1217) {
    //     const msg = 'user is being used';
    //     this.logger.warn(`removeProduct: not executed (${msg})`, error);
    //     throw new IsBeingUsedException(msg);
    //   }

    //   this.logger.error('remove: error', error);
    //   throw error;
    // })

  }

  // findOneByEmail(email: string): Promise<UserDto[]> {
  //   const start = performance.now();

  //   return this.findByEmail(email)
  //   .then( (entityList: User[]) => entityList.map( (entity: User) => new UserDto(entity.company.id, entity.name, entity.email, entity.id, entity.status) ) )// * map entities to DTOs
  //   .then( (dtoList: UserDto[]) => {
      
  //     if(dtoList.length == 0){
  //       const msg = `user not found, email=${email}`;
  //       this.logger.warn(`findOneByEmail: ${msg}`);
  //       throw new NotFoundException(msg);
  //     }

  //     const end = performance.now();
  //     this.logger.log(`findOneByEmail: executed, runtime=${(end - start) / 1000} seconds`);
  //     return dtoList;
  //   })
  //   .catch(error => {
  //     if(error instanceof NotFoundException)
  //       throw error;

  //     this.logger.error(`findOneByEmail: error`, error);
  //     throw error;
  //   })

  // }

  private prepareEntity(entity: User, dto: UserDto): Promise<User> {

    try {
      const company = new Company();
      company.id = dto.companyId;

      entity.id       = dto.id ? dto.id : undefined;
      entity.company  = company;
      entity.name     = dto.name.toUpperCase();
      entity.email    = dto.email.toUpperCase();;
      entity.status   = dto.status;

      return Promise.resolve(entity);

    } catch (error) {
      this.logger.error(`prepareEntity: error`, error);
      throw error;
    }
    
  }

  private save(entity: User): Promise<User> {
    const start = performance.now();

    const newEntity: User = this.userRepository.create(entity);

    return this.userRepository.save(newEntity)
    .then( (entity: User) => {
      const end = performance.now();
      this.logger.log(`save: OK, runtime=${(end - start) / 1000} seconds, entity=${JSON.stringify(entity)}`);
      return entity;
    })
  }
  
  // private updateUserRole(user: User, userRoleDtoList: UserRoleDto[] = []): Promise<UserRole[]> {
  //   this.logger.log(`updateUserRole: starting process... user=${JSON.stringify(user)}, userRoleDtoList=${JSON.stringify(userRoleDtoList)}`);
  //   const start = performance.now();

  //   if(userRoleDtoList.length == 0){
  //     this.logger.warn(`updateUserRole: not executed (user role list empty)`);
  //     return Promise.resolve([]);
  //   }

  //   // * find roles by id
  //   const roleIdList = userRoleDtoList.map( (item) => item.id );

  //   return this.roleRepository.findBy({ // TODO: Posiblemente aca deberia utilizarse el servicio y no el repositorio
  //     id: In(roleIdList),
  //   })
  //   .then( (roleList: Role[]) => {

  //     // * validate
  //     if(roleList.length !== roleIdList.length){
  //       const roleIdNotFoundList: string[] = roleIdList.filter( (id) => !roleList.find( (role) => role.id == id) );
  //       const msg = `roles not found, idList=${JSON.stringify(roleIdNotFoundList)}`;
  //       throw new NotFoundException(msg); 
  //     }

  //     // * create userRole
  //     return this.userRoleRepository.findBy( { user } ) // * find userRole
  //     .then( (userRoleList: UserRole[]) => this.userRoleRepository.remove(userRoleList)) // * remove userRoles
  //     .then( () => {
        
  //       // * generate user role list
  //       const userRoleList: UserRole[] = roleList.map( (role: Role) => {
  //         const userRole = new UserRole();
  //         userRole.user = user;
  //         userRole.role = role;
  //         return userRole;
  //       })
  
  //       // * bulk insert
  //       return this.bulkInsertUserRoles(userRoleList)
  //       .then( (userRoleList: UserRole[]) => {
  //         const end = performance.now();
  //         this.logger.log(`updateUserRole: OK, runtime=${(end - start) / 1000} seconds`);
  //         return userRoleList;
  //       })

  //     })

  //   })

  // }
  
  // private bulkInsertUserRoles(userRoleList: UserRole[]): Promise<UserRole[]> {
  //   const start = performance.now();
  //   this.logger.log(`bulkInsertUserRoles: starting process... listSize=${userRoleList.length}`);

  //   const newUserRoleList: UserRole[] = userRoleList.map( (value) => this.userRoleRepository.create(value));
    
  //   return this.userRoleRepository.manager.transaction( async(transactionalEntityManager) => {
      
  //     return transactionalEntityManager
  //       .createQueryBuilder()
  //       .insert()
  //       .into(UserRole)
  //       .values(newUserRoleList)
  //       .execute()
  //       .then( (insertResult: InsertResult) => {
  //         const end = performance.now();
  //         this.logger.log(`bulkInsertUserRoles: OK, runtime=${(end - start) / 1000} seconds, insertResult=${JSON.stringify(insertResult.raw)}`);
  //         return newUserRoleList;
  //       })
  //   })
  // }

  // findByValue(paginationDto: SearchPaginationDto, inputDto: SearchInputDto, companyId?: string): Promise<User[]> {
  //   const {page=1, limit=this.dbDefaultLimit} = paginationDto;

  //   // * search by id or partial value
  //   const value = inputDto.search
  //   if(value) {
  //     const whereById     = { id: value, active: true };
  //     const whereByValue  = { company: { id: companyId }, email: value, active: true };
  //     const where = isUUID(value) ? whereById : whereByValue;

  //     return this.userRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: where,
  //       // relations: {
  //       //   userRole: true
  //       // }
  //     })
  //   }

  //   // * search by value list
  //   if(inputDto.searchList?.length > 0) {
  //     return this.userRepository.find({
  //       take: limit,
  //       skip: (page - 1) * limit,
  //       where: {
  //         company: {
  //           id: companyId
  //         },
  //         name: Raw( (fieldName) => inputDto.searchList.map(value => `${fieldName} LIKE '%${value.replace(' ', '%')}%'`).join(' OR ') ),
  //         // email: In(inputDto.searchList),
  //         active: true
  //       },
  //       // relations: {
  //       //   userRole: true
  //       // }
  //     })
  //   }

  //   // * search all
  //   return this.userRepository.find({
  //     take: limit,
  //     skip: (page - 1) * limit,
  //     where: { 
  //       company: {
  //         id: companyId
  //       },
  //       active: true 
  //     },
  //     // relations: {
  //     //   userRole: true
  //     // }
  //   })
    
  // }

  
  
  // private findByEmail(email: string): Promise<User[]> {

  //   // * search
  //   return this.userRepository.find({
  //     where: { 
  //       email: email,
  //       status: UserStatusEnum.AVAILABLE,
  //       active: true 
  //     }
  //   })
    
  // }

  // private generateUserWithRoleList(user: User, userRoleList: UserRole[]): UserDto {

  //   let userRoleDtoList: UserRoleDto[] = [];
  //   let userPermissionDtoList: UserPermissionDto[] = [];

  //   if(userRoleList.length > 0){
  //     // * generate user role list
  //     userRoleDtoList = userRoleList.map( (userRole: UserRole) => new UserRoleDto(userRole.role.id, userRole.role.name) );
      
  //     // * generate user permission list
  //     userPermissionDtoList = userRoleList.reduce( (acc: UserPermissionDto[], userRole: UserRole) => {  
  //       const permissionDtoList     : PermissionDto[]     = userRole.role.rolePermission.map( rolePermission => rolePermission.permission );
  //       const userPermissionDtoList : UserPermissionDto[] = permissionDtoList.map( permission => new UserPermissionDto(permission.id, permission.code) )
  //       return acc.concat(userPermissionDtoList);

  //     }, []);
  //   } 

  //   // * generate user dto
  //   const userDto = new UserDto(user.company.id, user.name, user.email, user.password, user.id, user.status, userRoleDtoList, userPermissionDtoList);

  //   return userDto;
  // }

}
