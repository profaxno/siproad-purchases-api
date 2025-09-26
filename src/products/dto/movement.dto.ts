import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { MovementTypeEnum, MovementReasonEnum } from "../enums";

export class MovementDto {
  
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  relatedId?: string;

  @IsOptional()
  @IsNumber()
  relatedCode?: number;
  
  @IsIn([MovementTypeEnum.OUT, MovementTypeEnum.IN])
  type: number;

  @IsIn([MovementReasonEnum.SALE, MovementReasonEnum.PURCHASE, MovementReasonEnum.ADJUSTMENT])
  reason: number;

  @IsNumber()
  qty: number;

  @IsUUID()
  productId: string;

  @IsUUID()
  userId: string;
  
  constructor(type: number, reason: number, qty: number, productId: string, userId: string, id?: string, relatedId?: string, relatedCode?: number){
    this.type = type;
    this.reason = reason;
    this.qty = qty;
    this.productId = productId;
    this.userId = userId;
    this.id = id;
    this.relatedId = relatedId;
    this.relatedCode = relatedCode;
  } 

  // @IsOptional()
  // @IsUUID()
  // id?: string;

  // @IsIn([MovementTypeEnum.OUT, MovementTypeEnum.IN])
  // type: MovementTypeEnum;

  // @IsIn([MovementReasonEnum.SALE, MovementReasonEnum.PURCHASE, MovementReasonEnum.ADJUSTMENT])
  // reason: MovementReasonEnum;

  // @IsNumber()
  // qty: number;

  // @IsOptional()
  // @IsUUID()
  // relatedId?: string;
  
  // @IsOptional()
  // @IsNumber()
  // relatedCode?: number;

  // @IsUUID()
  // productId: string;

  // @IsUUID()
  // userId: string;
  
  // constructor(type: MovementTypeEnum, reason: MovementReasonEnum, qty: number, productId: string, userId: string, id?: string, relatedId?: string){
  //   this.id = id;
  //   this.type = type;
  //   this.reason = reason;
  //   this.qty = qty;
  //   this.relatedId = relatedId;
  //   this.productId = productId;
  //   this.userId = userId;
  // } 

}