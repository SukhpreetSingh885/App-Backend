import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";

import { UpdateReferralSettingsDto } from "./dto/update-referral-settings.dto";
import { ReferralService } from "./referral.service";

@Controller("referrals")
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
  ) {}

  @Get("my-codes")
  @UseGuards(JwtAuthGuard)
  getMyCodes(
    @Req() request: {
      user: AuthenticatedUser;
    },
  ) {
    return this.referralService.getMyCodes(
      request.user.id,
    );
  }

  @Get("settings")
  @UseGuards(JwtAuthGuard)
  getSettings() {
    return this.referralService.getSettings();
  }

  @Post("settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  updateSettings(
    @Body() dto: UpdateReferralSettingsDto,
  ) {
    return this.referralService.updateRewardAmount(
      dto.amount,
    );
  }
}