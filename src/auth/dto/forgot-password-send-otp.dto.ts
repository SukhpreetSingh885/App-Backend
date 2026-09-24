import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordSendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}