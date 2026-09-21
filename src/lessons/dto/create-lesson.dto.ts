import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Min } from "class-validator";

export class CreateLessonDto {
  @IsString() courseId!: string;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsUrl({ require_tld: false }) videoUrl!: string;
  @IsString() duration!: string;
  @IsInt() @Min(1) order!: number;
  @IsOptional() @IsBoolean() isPreview?: boolean;
}
