import {
  IsNotEmpty,
  IsString,
  Matches,
} from "class-validator";

export class SendMobileOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      "Mobile number must be in international format, for example +919876543210",
  })
  mobile!: string;
}