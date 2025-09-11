import { IsArray, IsOptional, IsString } from "class-validator";

export class PurchaseTypeSearchInputDto {
  
  @IsOptional()
  @IsString()
  name?: string;
  
  constructor(name?: string) {
    this.name = name;
  }

}