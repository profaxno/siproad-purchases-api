import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { ProductTypeEnum } from "../enums";

export class ProductSearchInputDto {
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })  
  nameCodeList?: string[];
  
  @IsOptional()
  @IsIn([ProductTypeEnum.P, ProductTypeEnum.PC, ProductTypeEnum.PCC])
  productType?: ProductTypeEnum;

  @IsOptional()
  @IsString()
  productCategoryId?: string;
  
  constructor(nameCodeList?: string[], productType?: ProductTypeEnum, productCategoryId?: string) {
    this.nameCodeList = nameCodeList;
    this.productType = productType;
    this.productCategoryId = productCategoryId;
  }

}