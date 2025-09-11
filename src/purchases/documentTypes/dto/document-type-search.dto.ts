import { IsArray, IsOptional, IsString } from "class-validator";

export class DocumentTypeSearchInputDto {
  
  @IsOptional()
  @IsString()
  name?: string;
  
  constructor(name?: string) {
    this.name = name;
  }

}