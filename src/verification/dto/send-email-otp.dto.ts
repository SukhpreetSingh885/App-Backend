import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from "class-validator";

export class SendEmailOtpDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}