import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class VerifyMobileOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      "Mobile number must be in international format, for example +919876543210",
  })
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp!: string;
}