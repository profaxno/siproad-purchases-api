import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PurchaseTypeDto } from "./";

export class PurchaseOrderCompanyDto {
  @IsUUID()
  id: string;

  @IsString()
  @MaxLength(50)
  name: string;

  constructor(id: string, name: string){
    this.id = id;
    this.name = name;
  }
}

export class PurchaseOrderUserDto {
  @IsUUID()
  id: string;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(50)
  email: string;

  constructor(id: string, name: string, email: string){
    this.id = id;
    this.name = name;
    this.email = email;
  }
}

export class PurchaseOrderDto {
  
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  code?: number;

  @IsUUID()
  companyId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  purchaseTypeId?: string;

  @IsOptional()
  @IsUUID()
  documentTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  providerIdDoc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  providerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  providerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  providerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  providerAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
  
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @Type(() => PurchaseOrderCompanyDto)
  company?: PurchaseOrderCompanyDto;

  @IsOptional()
  @Type(() => PurchaseOrderUserDto)
  user?: PurchaseOrderUserDto;

  @IsOptional()
  @Type(() => PurchaseTypeDto)
  purchaseType?: PurchaseTypeDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderProductDto)
  productList?: PurchaseOrderProductDto[];

  constructor(companyId: string, id?: string, purchaseTypeId?: string, code?: number, providerIdDoc?: string, providerName?: string, providerEmail?: string, providerPhone?: string, providerAddress?: string, comment?: string, amount?: number, documentTypeId?: string, documentNumber?: string, status?: number, createdAt?: string, company?: PurchaseOrderCompanyDto, user?: PurchaseOrderUserDto, purchaseType?: PurchaseTypeDto, productList?: PurchaseOrderProductDto[]){
    this.companyId = companyId;
    this.id = id;
    this.purchaseTypeId = purchaseTypeId;
    this.code = code;
    this.providerIdDoc = providerIdDoc;
    this.providerName = providerName;
    this.providerEmail = providerEmail;
    this.providerPhone = providerPhone;
    this.providerAddress = providerAddress
    this.comment = comment;
    this.amount = amount;
    this.documentTypeId = documentTypeId;
    this.documentNumber = documentNumber;
    this.status = status;
    this.createdAt = createdAt;
    this.company = company;
    this.user = user;
    this.purchaseType = purchaseType;
    this.productList = productList;
  }
}

export class PurchaseOrderProductDto {
  @IsUUID()
  id: string;

  @IsNumber()
  @IsPositive()
  qty: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  comment?: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsBoolean()
  updateProductCost: boolean;
  
  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;
  
  constructor(id: string, qty: number, name: string, cost: number, amount: number, comment?: string, code?: string, status?: number){
    this.id = id;
    this.qty = qty;
    this.name = name;
    this.cost = cost;
    this.amount = amount;
    this.comment = comment;
    this.code = code;
    this.status = status;
  }
}