import { IsEmail } from "class-validator";

export class SendEmailChangeOtpDto {
  @IsEmail()
  email!: string;
}