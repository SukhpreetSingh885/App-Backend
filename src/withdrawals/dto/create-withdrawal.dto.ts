import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";

import { PayoutMethod } from "../schemas/withdrawal.schema";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateWithdrawalDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PayoutMethod)
  payoutMethod!: PayoutMethod;

  @ValidateIf((dto: CreateWithdrawalDto) =>
    dto.payoutMethod === PayoutMethod.Upi)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  upiId?: string;

  @ValidateIf((dto: CreateWithdrawalDto) =>
    dto.payoutMethod === PayoutMethod.Bank)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  accountHolderName?: string;

  @ValidateIf((dto: CreateWithdrawalDto) =>
    dto.payoutMethod === PayoutMethod.Bank)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  bankAccountNumber?: string;

  @ValidateIf((dto: CreateWithdrawalDto) =>
    dto.payoutMethod === PayoutMethod.Bank)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  ifscCode?: string;
}
