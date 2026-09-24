import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AdminGuard } from "../admin/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { CreateWithdrawalDto } from "./dto/create-withdrawal.dto";
import { UpdateWithdrawalSettingsDto } from "./dto/update-withdrawal-settings.dto";
import { UpdateWithdrawalStatusDto } from "./dto/update-withdrawal-status.dto";
import { WithdrawalsService } from "./withdrawals.service";

@Controller("withdrawals")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class WithdrawalsController {
  constructor(
    private readonly withdrawalsService:
      WithdrawalsService,
  ) {}

  @Get("settings")
  getSettings() {
    return this.withdrawalsService
      .getStudentSettings();
  }

  @Get("me")
  findMine(
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.withdrawalsService.findMine(
      request.user.id,
    );
  }

  @Post()
  create(
    @Req() request: { user: AuthenticatedUser },
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalsService.create(
      request.user.id,
      dto,
    );
  }
}

@Controller("admin/withdrawals")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminWithdrawalsController {
  constructor(
    private readonly withdrawalsService:
      WithdrawalsService,
  ) {}

  @Get()
  findAll() {
    return this.withdrawalsService.findAllForAdmin();
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateWithdrawalStatusDto,
  ) {
    return this.withdrawalsService.updateStatus(
      id,
      dto,
    );
  }

  @Get("settings")
  getSettings() {
    return this.withdrawalsService.getAdminSettings();
  }

  @Patch("settings")
  updateSettings(
    @Body() dto: UpdateWithdrawalSettingsDto,
  ) {
    return this.withdrawalsService.updateSettings(dto);
  }
}
