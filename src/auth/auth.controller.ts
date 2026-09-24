import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";

import { AuthService } from "./auth.service";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordSendOtpDto } from "./dto/forgot-password-send-otp.dto";
import { ForgotPasswordVerifyOtpDto } from "./dto/forgot-password-verify-otp.dto";
import { ForgotPasswordResetDto } from "./dto/forgot-password-reset.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("forgot-password/send-otp")
  @HttpCode(HttpStatus.OK)
  sendForgotPasswordOtp(
    @Body() dto: ForgotPasswordSendOtpDto,
  ) {
    return this.authService.sendForgotPasswordOtp(
      dto.email,
    );
  }

  @Post("forgot-password/verify-otp")
  @HttpCode(HttpStatus.OK)
  verifyForgotPasswordOtp(
    @Body() dto: ForgotPasswordVerifyOtpDto,
  ) {
    return this.authService.verifyForgotPasswordOtp(
      dto.email,
      dto.otp,
    );
  }

  @Post("forgot-password/reset")
  @HttpCode(HttpStatus.OK)
  resetForgotPassword(
    @Body() dto: ForgotPasswordResetDto,
  ) {
    return this.authService.resetForgotPassword(
      dto.email,
      dto.password,
    );
  }
}