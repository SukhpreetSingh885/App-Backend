import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from "class-validator";

export class CreateLessonDto {
  @IsString()
  courseId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsIn(["upload", "url"])
  videoSource!: "upload" | "url";

  @IsUrl({ require_tld: false })
  videoUrl!: string;

  @IsOptional()
  @IsString()
  videoPublicId?: string;

  @IsString()
  duration!: string;

  @IsInt()
  @Min(1)
  order!: number;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}