import { Transform } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";

import { WithdrawalStatus } from "../schemas/withdrawal.schema";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class UpdateWithdrawalStatusDto {
  @IsEnum(WithdrawalStatus)
  status!: WithdrawalStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  adminNote?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  failureReason?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  providerReference?: string;
}
