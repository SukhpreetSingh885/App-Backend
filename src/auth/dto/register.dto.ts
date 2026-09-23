import {
  IsEmail,
  IsString,
  Matches,
  MinLength,
  IsOptional
} from "class-validator";


export class RegisterDto {

  @IsString()
  @MinLength(2)
  name!: string;


  @IsEmail()
  email!: string;


  @IsString()
  @MinLength(8)
  password!: string;


  @IsString()
  @Matches(/^\d{6,14}$/, {
    message: "mobile must contain 6 to 14 digits",
  })
  mobile!: string;


  @IsString()
  @Matches(/^\+[1-9]\d{0,2}$/, {
    message: "countryCode must be a valid calling code such as +91",
  })
  countryCode!: string;
@IsOptional()
@IsString()
referralCode?: string;
}
