import {
  Body,
  Controller,
  Post,
} from "@nestjs/common";

import { VerificationService } from "./verification.service";
import { SendEmailOtpDto } from "./dto/send-email-otp.dto";
import { VerifyEmailOtpDto } from "./dto/verify-email-otp.dto";
import { SendMobileOtpDto } from "./dto/send-mobile-otp.dto";
import { VerifyMobileOtpDto } from "./dto/verify-mobile-otp.dto";

@Controller("verification")
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
  ) {}

  @Post("email/send")
  sendEmailOtp(
    @Body() dto: SendEmailOtpDto,
  ) {
    return this.verificationService.sendEmailOtp(
      dto.email,
    );
  }

  @Post("email/verify")
  verifyEmailOtp(
    @Body() dto: VerifyEmailOtpDto,
  ) {
    return this.verificationService.verifyEmailOtp(
      dto.email,
      dto.otp,
    );
  }

  @Post("mobile/send")
  sendMobileOtp(
    @Body() dto: SendMobileOtpDto,
  ) {
    return this.verificationService.sendMobileOtp(
      dto.mobile,
    );
  }

  @Post("mobile/verify")
  verifyMobileOtp(
    @Body() dto: VerifyMobileOtpDto,
  ) {
    return this.verificationService.verifyMobileOtp(
      dto.mobile,
      dto.otp,
    );
  }
}