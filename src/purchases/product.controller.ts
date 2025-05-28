import { PfxHttpResponseDto } from 'profaxnojs/axios';
import { ProcessSummaryDto, SearchInputDto, SearchPaginationDto } from 'profaxnojs/util';

import { Controller, Get, Body, Patch, Param, Delete, Logger, HttpCode, HttpStatus, Query, ParseUUIDPipe, NotFoundException, Post } from '@nestjs/common';

import { ProductDto } from './dto';
import { ProductSearchInputDto } from './dto/product-search.dto';
import { ProductService } from './product.service';
import { AlreadyExistException, IsBeingUsedException } from '../common/exceptions/common.exception';

@Controller('products')
export class ProductController {

  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService
  ) {}

  // @Post('/updateBatch')
  // @HttpCode(HttpStatus.OK)
  // updateBatch(@Body() dtoList: ProductDto[]): Promise<PfxHttpResponseDto> {
  //   this.logger.log(`>>> updateBatch: listSize=${dtoList.length}`);
  //   const start = performance.now();

  //   return this.productService.updateBatch(dtoList)
  //   .then( (processSummaryDto: ProcessSummaryDto) => {
  //     const response = new PfxHttpResponseDto(HttpStatus.OK, "executed", undefined, processSummaryDto);
  //     const end = performance.now();
  //     this.logger.log(`<<< updateBatch: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
  //     return response;
  //   })
  //   .catch( (error: Error) => {
  //     this.logger.error(error.stack);
  //     return new PfxHttpResponseDto(HttpStatus.INTERNAL_SERVER_ERROR, error.message);
  //   })

  // }
  
  @Patch('/update')
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: ProductDto): Promise<PfxHttpResponseDto> {
    this.logger.log(`>>> update: dto=${JSON.stringify(dto)}`);
    const start = performance.now();

    return this.productService.update(dto)
    .then( (dto: ProductDto) => {
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

  @Get('/searchByValues/:companyId')
  searchByValues(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() paginationDto: SearchPaginationDto,
    @Body() inputDto: ProductSearchInputDto
  ): Promise<PfxHttpResponseDto> {

    this.logger.log(`>>> searchByValues: companyId=${companyId}, paginationDto=${JSON.stringify(paginationDto)}, inputDto=${JSON.stringify(inputDto)}`);
    const start = performance.now();
    
    return this.productService.searchByValues(companyId, paginationDto, inputDto)
    .then( (dtoList: ProductDto[]) => {
      const response = new PfxHttpResponseDto(HttpStatus.OK, "executed", dtoList.length, dtoList);
      const end = performance.now();
      this.logger.log(`<<< searchByValues: executed, runtime=${(end - start) / 1000} seconds, response=${JSON.stringify(response)}`);
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

    return this.productService.remove(id)
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
