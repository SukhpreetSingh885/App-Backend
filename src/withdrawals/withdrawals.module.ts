import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AdminGuard } from "../admin/guards/admin.guard";
import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../common/guards/roles.guard";
import { NotificationsModule } from "../notifications/notifications.module";
import { WalletModule } from "../wallet/wallet.module";
import {
  WithdrawalSettings,
  WithdrawalSettingsSchema,
} from "./schemas/withdrawal-settings.schema";
import {
  Withdrawal,
  WithdrawalSchema,
} from "./schemas/withdrawal.schema";
import {
  AdminWithdrawalsController,
  WithdrawalsController,
} from "./withdrawals.controller";
import { WithdrawalsService } from "./withdrawals.service";

@Module({
  imports: [
    AuthModule,
    WalletModule,
    NotificationsModule,
    MongooseModule.forFeature([
      {
        name: Withdrawal.name,
        schema: WithdrawalSchema,
      },
      {
        name: WithdrawalSettings.name,
        schema: WithdrawalSettingsSchema,
      },
    ]),
  ],
  controllers: [
    WithdrawalsController,
    AdminWithdrawalsController,
  ],
  providers: [
    WithdrawalsService,
    RolesGuard,
    AdminGuard,
  ],
})
export class WithdrawalsModule {}
