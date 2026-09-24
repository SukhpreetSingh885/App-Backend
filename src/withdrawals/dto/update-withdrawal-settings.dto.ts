import {
  IsBoolean,
  IsNumber,
  Min,
} from "class-validator";

export class UpdateWithdrawalSettingsDto {
  @IsBoolean()
  withdrawalsEnabled!: boolean;

  @IsNumber()
  @Min(0)
  minimumWithdrawalAmount!: number;
}
