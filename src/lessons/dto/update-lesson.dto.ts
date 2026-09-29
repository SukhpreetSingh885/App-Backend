import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from "class-validator";

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(["Development", "Design", "Marketing", "Business", "AI"])
  category?: "Development" | "Design" | "Marketing" | "Business" | "AI";

  @IsOptional()
  @IsIn(["upload", "url"])
  videoSource?: "upload" | "url";

  @IsOptional()
  @IsUrl({ require_tld: false })
  videoUrl?: string;

  @IsOptional()
  @IsString()
  videoPublicId?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}
