import { Module } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";

import { ReferralService } from "./referral.service";

import { ReferralController } from "./referral.controller";

import {
  ReferralCode,
  ReferralCodeSchema,
} from "./schemas/referral-code.schema";
import {
  ReferralUsage,
  ReferralUsageSchema,
} from "./schemas/referral-usage.schema";
import {
  ReferralSettings,
  ReferralSettingsSchema,
} from "./schemas/referral-settings.schema";
@Module({

  imports: [

  MongooseModule.forFeature([

  {
    name: ReferralCode.name,
    schema: ReferralCodeSchema,
  },

  {
    name: ReferralUsage.name,
    schema: ReferralUsageSchema,
  },
{
  name: ReferralSettings.name,
  schema: ReferralSettingsSchema,
},
]),

  ],


  controllers: [
    ReferralController,
  ],


  providers: [
    ReferralService,
  ],


  exports: [
    ReferralService,
  ],

})
export class ReferralModule {}