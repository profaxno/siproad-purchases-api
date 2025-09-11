import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { ProductTypeEnum } from "../enums";

export class ProductSearchInputDto {
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })  
  nameCodeList?: string[];
  
  @IsOptional()
  @IsArray()
  productTypeList?: ProductTypeEnum[];

  @IsOptional()
  @IsString()
  productCategoryId?: string;
  
  constructor(nameCodeList?: string[], productTypeList?: ProductTypeEnum[], productCategoryId?: string) {
    this.nameCodeList = nameCodeList;
    this.productTypeList = productTypeList;
    this.productCategoryId = productCategoryId;
  }

}