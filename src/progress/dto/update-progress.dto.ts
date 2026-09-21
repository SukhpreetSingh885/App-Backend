import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateProgressDto {
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsNumber() @Min(0) lastWatchedPosition?: number;
}
