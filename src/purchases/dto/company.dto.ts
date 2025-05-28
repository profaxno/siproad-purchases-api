import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CompanyDto {
  
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @MaxLength(50)
  name: string;

  constructor(name: string, id?: string) {
    this.name = name;
    this.id = id;
  }
}
