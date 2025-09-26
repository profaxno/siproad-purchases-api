import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { MovementTypeEnum, MovementReasonEnum } from "../enums";

export class ProductCostDto {
  
  productId: string;

  cost: number;

  relatedId: string;

  userId: string;
  
  constructor(productId: string, cost: number, relatedId: string, userId: string){
    this.productId = productId;
    this.cost = cost;
    this.relatedId = relatedId;
    this.userId = userId;
  } 

}