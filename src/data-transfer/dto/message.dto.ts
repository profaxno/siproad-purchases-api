import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";
import { ProcessEnum, SourceEnum } from "../enums";

export class MessageDto {
    @IsString()
    source: SourceEnum;

    @IsString()
    process: ProcessEnum;

    @IsString()
    jsonData: string;

    constructor(source: SourceEnum, process: ProcessEnum, jsonData: string) {
        this.source = source;
        this.process = process;
        this.jsonData = jsonData;
    }
}