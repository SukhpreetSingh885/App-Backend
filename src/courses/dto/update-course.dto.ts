import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

import { CourseStatus } from "../interfaces/course.interface";
import { CreateModuleDto } from "./create-course.dto";

export class UpdateCourseDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() thumbnail?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) originalPrice?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(5) rating?: number;
  @IsOptional() @IsInt() @Min(0) students?: number;
  @IsOptional() @IsInt() @Min(0) lessons?: number;
  @IsOptional() @IsString() instructor?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModuleDto)
  modules?: CreateModuleDto[];
  @IsOptional() @IsEnum(CourseStatus) status?: CourseStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() popular?: boolean;
}
