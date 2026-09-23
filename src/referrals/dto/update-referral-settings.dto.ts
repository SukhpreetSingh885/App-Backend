import {
  IsNumber,
  Min,
} from "class-validator";

export class UpdateReferralSettingsDto {
  @IsNumber()
  @Min(0)
  amount!: number;
}