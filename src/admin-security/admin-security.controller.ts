import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";

import { AdminOtpService } from "./admin-otp.service";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ChangeEmailDto } from "./dto/change-email.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

import {
  AdminOtpPurpose,
} from "./schemas/admin-otp.schema";

import { UsersService } from "../users/users.service";


@Controller("admin/security")
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(UserRole.Admin)
export class AdminSecurityController {


  constructor(
    private readonly adminOtpService: AdminOtpService,
    private readonly usersService: UsersService,
  ) {}



  // =========================
  // PASSWORD CHANGE
  // =========================


  @Post("request-password-change")
  async requestPasswordChange(
    @Req()
    request: {
      user: AuthenticatedUser;
    },
  ) {

    await this.adminOtpService.createOtp(
      request.user.id,
      AdminOtpPurpose.ChangePassword,
      request.user.email,
    );


    return {
      message:
        "OTP sent successfully",
    };
  }




  @Post("verify-otp")
  async verifyOtp(

    @Req()
    request: {
      user: AuthenticatedUser;
    },

    @Body()
    dto: VerifyOtpDto,

  ) {

    return this.adminOtpService.verifyOtp(
      request.user.id,
      dto.purpose,
      dto.otp,
    );
  }




  @Post("change-password")
  async changePassword(

    @Req()
    request: {
      user: AuthenticatedUser;
    },

    @Body()
    dto: ChangePasswordDto,

  ) {

    await this.usersService.changePassword(
      request.user.id,
      dto.newPassword,
    );


    return {
      message:
        "Password changed successfully",
    };
  }






  // =========================
  // EMAIL CHANGE
  // =========================



  // Step 1:
  // Send OTP to old/current email

  @Post("request-old-email-otp")
  async requestOldEmailOtp(

    @Req()
    request: {
      user: AuthenticatedUser;
    },

  ) {

    await this.adminOtpService.createOldEmailChangeOtp(
      request.user.id,
      request.user.email,
    );


    return {
      message:
        "OTP sent to current email",
    };
  }





  // Step 2:
  // Verify old email OTP

  @Post("verify-old-email-otp")
  async verifyOldEmailOtp(

    @Req()
    request: {
      user: AuthenticatedUser;
    },

    @Body()
    dto: VerifyOtpDto,

  ) {

    return this.adminOtpService.verifyOldEmailOtp(
      request.user.id,
      dto.otp,
    );
  }






  // Step 3:
  // Send OTP to new email

  @Post("request-new-email-otp")
  async requestNewEmailOtp(

    @Req()
    request: {
      user: AuthenticatedUser;
    },

    @Body()
    dto: ChangeEmailDto,

  ) {

    await this.adminOtpService.createNewEmailOtp(
      request.user.id,
      dto.newEmail,
    );


    return {
      message:
        "OTP sent to new email",
    };
  }






  // Step 4:
  // Verify new email OTP

  @Post("verify-new-email-otp")
  async verifyNewEmailOtp(

    @Req()
    request: {
      user: AuthenticatedUser;
    },

    @Body()
    dto: VerifyOtpDto,

  ) {

    return this.adminOtpService.verifyOtp(
      request.user.id,
      AdminOtpPurpose.VerifyNewEmail,
      dto.otp,
    );
  }






  // Step 5:
  // Update database email

  @Post("change-email")
  async changeEmail(

    @Req()
    request: {
      user: AuthenticatedUser;
    },

    @Body()
    dto: ChangeEmailDto,

  ) {

    await this.usersService.changeEmail(
      request.user.id,
      dto.newEmail,
    );


    return {
      message:
        "Email changed successfully",
    };
  }

}