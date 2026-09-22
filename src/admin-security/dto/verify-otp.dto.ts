import {
  IsEnum,
  IsString,
  Length,
} from "class-validator";

import {
  AdminOtpPurpose,
} from "../schemas/admin-otp.schema";


export class VerifyOtpDto {

  @IsString()
  @Length(6, 6)
  otp!: string;


  @IsEnum(AdminOtpPurpose)
  purpose!: AdminOtpPurpose;

}