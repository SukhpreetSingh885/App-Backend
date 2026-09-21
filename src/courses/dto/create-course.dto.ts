import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";


export class CreateLessonDto {
  @IsString()
  title!: string;


  @IsOptional()
  @IsString()
  duration?: string;


  @IsOptional()
  @IsString()
  videoUrl?: string;


  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}


export class CreateModuleDto {
  @IsString()
  title!: string;


  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonDto)
  lessons?: CreateLessonDto[];
}


export class CreateCourseDto {

  @IsString()
  title!: string;


  @IsString()
  description!: string;


  @IsOptional()
  @IsString()
  instructor?: string;


  @IsOptional()
  @IsString()
  category?: string;


  @IsOptional()
  @IsString()
  thumbnail?: string;


  @IsOptional()
  @IsNumber()
  price?: number;


  @IsOptional()
  @IsNumber()
  originalPrice?: number;


  @IsOptional()
  @IsNumber()
  rating?: number;


  @IsOptional()
  @IsNumber()
  students?: number;


  @IsOptional()
  @IsNumber()
  lessons?: number;


  @IsOptional()
  @IsString()
  duration?: string;


  @IsOptional()
  @IsString()
  language?: string;


  @IsOptional()
  @IsString()
  level?: string;


  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModuleDto)
  modules?: CreateModuleDto[];


  @IsOptional()
  @IsString()
  status?: string;


  @IsOptional()
  @IsBoolean()
  featured?: boolean;


  @IsOptional()
  @IsBoolean()
  popular?: boolean;
}
