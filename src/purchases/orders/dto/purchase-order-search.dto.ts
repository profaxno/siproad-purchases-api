import { IsArray, IsOptional, IsString } from "class-validator";

export class PurchaseOrderSearchInputDto {
  
  @IsOptional()
  @IsString()
  createdAtInit?: string;

  @IsOptional()
  @IsString()
  createdAtEnd?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  providerNameIdDoc?: string;
  
  @IsOptional()
  @IsString()
  comment?: string;
  
  constructor(createdAtInit?: string, createdAtEnd?: string, code?: string, providerNameIdDoc?: string, comment?: string) {
    this.createdAtInit = createdAtInit;
    this.createdAtEnd = createdAtEnd;
    this.code = code;
    this.providerNameIdDoc = providerNameIdDoc;
    this.comment = comment;
  }

}