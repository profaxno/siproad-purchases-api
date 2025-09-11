import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { ProductTypeEnum, UnitMeasuresEnum } from "../enums";

export class ProductDto {
  
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  productCategoryId?: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;

  @IsOptional()
  @IsIn([UnitMeasuresEnum.UN, UnitMeasuresEnum.KG])
  @MaxLength(5)
  unit?: string;

  @IsNumber()
  cost: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsIn([ProductTypeEnum.P, ProductTypeEnum.PC, ProductTypeEnum.PCC])
  type: ProductTypeEnum;

  @IsBoolean()
  enable4Sale: boolean;

  constructor(companyId: string, name: string, cost: number, type: ProductTypeEnum, enable4Sale: boolean, id?: string, productCategoryId?: string, code?: string, description?: string, unit?: string, price?: number) {
    this.companyId = companyId;
    this.name = name;
    this.cost = cost;
    this.type = type;
    this.enable4Sale = enable4Sale;
    this.id = id;
    this.productCategoryId = productCategoryId;
    this.code = code;
    this.description = description;
    this.unit = unit;
    this.price = price;
  }

}