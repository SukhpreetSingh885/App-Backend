
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import { Request } from "express";

import { Throttle } from "@nestjs/throttler";

import { AuthService } from "./auth.service";

import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordSendOtpDto } from "./dto/forgot-password-send-otp.dto";
import { ForgotPasswordVerifyOtpDto } from "./dto/forgot-password-verify-otp.dto";
import { ForgotPasswordResetDto } from "./dto/forgot-password-reset.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // Registration: 5 requests per 10 minutes
  @Post("register")
  @Throttle({
    default: {
      limit: 5,
      ttl: 600000,
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Login: 5 requests per minute
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      req.ip ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress;
    const userAgent = req.headers["user-agent"];
    return this.authService.login(dto, { ipAddress, userAgent });
  }
@Post("refresh")
@HttpCode(HttpStatus.OK)
@Throttle({
  default: {
    limit: 10,
    ttl: 60000,
  },
})
refresh(
  @Body() dto: RefreshTokenDto,
  @Req() req: Request,
) {

  const ipAddress =
    req.ip ||
    (req.headers["x-forwarded-for"] as string)
      ?.split(",")[0]
      ?.trim() ||
    req.socket?.remoteAddress;


  const userAgent =
    req.headers["user-agent"];


  return this.authService.refreshToken(
    dto.refreshToken,
    {
      ipAddress,
      userAgent,
    },
  );
}
  // Send OTP: 3 requests per 10 minutes
  @Post("forgot-password/send-otp")
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 3,
      ttl: 600000,
    },
  })
  sendForgotPasswordOtp(
    @Body() dto: ForgotPasswordSendOtpDto,
  ) {
    return this.authService.sendForgotPasswordOtp(
      dto.email,
    );
  }

  // Verify OTP: 5 requests per 10 minutes
  @Post("forgot-password/verify-otp")
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: 600000,
    },
  })
  verifyForgotPasswordOtp(
    @Body() dto: ForgotPasswordVerifyOtpDto,
  ) {
    return this.authService.verifyForgotPasswordOtp(
      dto.email,
      dto.otp,
    );
  }

  // Reset password: 5 requests per 10 minutes
  @Post("forgot-password/reset")
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 10,
      ttl: 600000,
    },
  })
  resetForgotPassword(
    @Body() dto: ForgotPasswordResetDto,
  ) {
    return this.authService.resetForgotPassword(
      dto.email,
      dto.password,
    );
  }
}
