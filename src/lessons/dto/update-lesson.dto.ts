import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Min } from "class-validator";

export class UpdateLessonDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl({ require_tld: false }) videoUrl?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsInt() @Min(1) order?: number;
  @IsOptional() @IsBoolean() isPreview?: boolean;
}
