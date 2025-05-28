import { PfxHttpResponseDto } from 'profaxnojs/axios';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Controller, Get, Post, Body, Patch, Param, Delete, Logger, HttpCode, HttpStatus, Query, ParseUUIDPipe, NotFoundException } from '@nestjs/common';

import { UserDto } from './dto';
import { UserService } from './user.service';
import { AlreadyExistException, IsBeingUsedException } from '../common/exceptions/common.exception';


@Controller('users')
export class UserController {

  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService
  ) {}

  @Post('/updateBatch')
  @HttpCode(HttpStatus.OK)
  updateBatch(@Body() dtoList: UserDto[]): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> updateBatch: listSize=${dtoList.length}`);
    const start = performance.now();

    return this.userService.updateBatch(dtoList)
    .then( (processSummaryDto: ProcessSummaryDto) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, "executed", undefined, processSummaryDto);
      const end = performance.now();
      this.logger.log(`<<< updateBatch: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }

  @Patch('/update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UserDto): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> update: dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.userService.update(dto)
    .then( (dto: UserDto) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, 'executed', 1, [dto]);
      const end = performance.now();
      this.logger.log(`<<< update: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new PfxHttpResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);
      
      if(error instanceof AlreadyExistException)
        return new PfxHttpResponseDto(HttpStatus.BAD_REQUEST, error.message, 0, []);

      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })
  }

  @Get('/find/:companyId')
  find(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() paginationDto: SearchPaginationDto,
    @Body() inputDto: SearchInputDto
  ): Promise<PfxHttpResponseDto> {

    this.logger.log(`>>> find: companyId=${companyId}, paginationDto=${JSON.stringify(paginationDto)}, inputDto=${JSON.stringify(inputDto)}`);
    const start = performance.now();
    
    return this.userService.find(companyId, paginationDto, inputDto)
    .then( (dtoList: UserDto[]) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< find: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new PfxHttpResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })
  }

  @Get('/findOneById/:id')
  findOneById(@Param('id', ParseUUIDPipe) id: string): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> findOneById: id=${id}`);
    const start = performance.now();

    return this.userService.findOneById(id)
    .then( (dtoList: UserDto[]) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< findOneById: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new PfxHttpResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }

  @Get('/findByValue/:companyId/:value')
  findByValue(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('value') value: string
  ): Promise<PfxHttpResponseDto> {

    this.logger.log(`>>> findByValue: companyId=${companyId}, value=${value}`);
    const start = performance.now();

    return this.userService.findOneById(value, companyId)
    .then( (dtoList: UserDto[]) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< findByValue: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new PfxHttpResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }

  @Get('/findOneByEmail/:email')
  findOneByEmail(@Param('email') email: string): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> findOneByEmail: email=${email}`);
    const start = performance.now();

    return this.userService.findOneByEmail(email)
    .then( (dtoList: UserDto[]) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< findOneByEmail: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new PfxHttpResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })

  }
  
  @Delete('/:id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> remove: id=${id}`);
    const start = performance.now();

    return this.userService.remove(id)
    .then( (msg: string) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, msg);
      const end = performance.now();
      this.logger.log(`<<< remove: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      if(error instanceof NotFoundException)
        return new PfxHttpResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);
      
      if(error instanceof IsBeingUsedException)
        return new PfxHttpResponseDto(HttpStatus.BAD_REQUEST, error.message, 0, []);

      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })
  }

}
