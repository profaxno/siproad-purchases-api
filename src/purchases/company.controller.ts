import { PfxHttpResponseDto } from 'profaxnojs/axios';
import { SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Controller, Get, Body, Patch, Param, Delete, Logger, HttpCode, HttpStatus, Query, ParseUUIDPipe, NotFoundException } from '@nestjs/common';

import { CompanyDto } from './dto';
import { CompanyService } from './company.service';
import { AlreadyExistException, IsBeingUsedException } from '../common/exceptions/common.exception';


@Controller('companies')
export class CompanyController {

  private readonly logger = new Logger(CompanyController.name);

  constructor(
    private readonly companyService: CompanyService
  ) {}
  
  @Patch('/update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: CompanyDto): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> update: dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.companyService.update(dto)
    .then( (dto: CompanyDto) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, 'executed', 1, [dto]);
      const end = performance.now();
      this.logger.log(`<<< update: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
      return response;
    })
    .catch( (error: Error) => {
      // if(error instanceof NotFoundException)
      //   return new PfxHttpResponseDto(HttpStatus.NOT_FOUND, error.message, 0, []);

      if(error instanceof AlreadyExistException)
        return new PfxHttpResponseDto(HttpStatus.BAD_REQUEST, error.message, 0, []);

      this.logger.error(error.stack);
      return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
    })
  }

  @Get('/find')
  find(
    @Query() paginationDto: SearchPaginationDto,
    @Body() inputDto: SearchInputDto
  ): Promise<PfxHttpResponseDto> {
    
    this.logger.log(`>>> find: paginationDto=${JSON.stringify(paginationDto)}, inputDto=${JSON.stringify(inputDto)}`);
    const start = performance.now();
    
    return this.companyService.find(paginationDto, inputDto)
     .then( (dtoList: CompanyDto[]) => {
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
  findOneById(@Param('id') id: string): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> findOneById: id=${id}`);
    const start = performance.now();

    return this.companyService.findOneById(id)
    .then( (dtoList: CompanyDto[]) => {
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

  @Delete('/:id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> remove: id=${id}`);
    const start = performance.now();

    return this.companyService.remove(id)
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

  // TODO: Crear endpoint test a todos los controllers
  
}
