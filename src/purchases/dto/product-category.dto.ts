import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ProductCategoryDto {
  
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @MaxLength(50)
  name: string;

  constructor(companyId: string, name: string, id?: string) {
    this.companyId = companyId;
    this.name = name;
    this.id = id;
  }
}
