import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
} from "class-validator";

export class ForgotPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/,
    {
      message:
        "Password needs 8 characters, uppercase, lowercase, number and special character",
    },
  )
  password!: string;
}