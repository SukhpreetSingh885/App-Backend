import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { VerificationService } from "../verification/verification.service";

import { SendEmailChangeOtpDto } from "./dto/send-email-change-otp.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { VerifyEmailChangeOtpDto } from "./dto/verify-email-change-otp.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly verificationService: VerificationService,
  ) {}

  @Get("me")
  getProfile(
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.usersService.findById(
      request.user.id,
    );
  }

  @Patch("me")
  updateProfile(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(
      request.user.id,
      dto,
    );
  }

  @Post("me/email/send-otp")
  async sendEmailChangeOtp(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: SendEmailChangeOtpDto,
  ) {
    const currentUser =
      await this.usersService.findById(
        request.user.id,
      );

    const newEmail =
      dto.email.trim().toLowerCase();

    if (
      currentUser.email.toLowerCase() ===
      newEmail
    ) {
      throw new BadRequestException(
        "New email must be different from your current email",
      );
    }

    const alreadyExists =
      await this.usersService.existsByEmail(
        newEmail,
      );

    if (alreadyExists) {
      throw new BadRequestException(
        "An account with this email already exists",
      );
    }

    return this.verificationService
      .sendEmailChangeOtp(newEmail);
  }

  @Post("me/email/verify")
  async verifyEmailChangeOtp(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: VerifyEmailChangeOtpDto,
  ) {
    const newEmail =
      dto.email.trim().toLowerCase();

    await this.verificationService
      .verifyEmailChangeOtp(
        newEmail,
        dto.otp,
      );

    const verified =
      await this.verificationService
        .isEmailChangeVerified(newEmail);

    if (!verified) {
      throw new BadRequestException(
        "New email has not been verified",
      );
    }

    await this.usersService.changeEmail(
      request.user.id,
      newEmail,
    );

    await this.verificationService
      .consumeEmailChangeVerification(
        newEmail,
      );

    return {
      message:
        "Email changed successfully",
      email: newEmail,
    };
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  findOne(
    @Param("id") id: string,
  ) {
    return this.usersService.findById(id);
  }
}