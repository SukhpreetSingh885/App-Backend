import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { CoursesModule } from "../courses/courses.module";

import { EnrollmentsController } from "./enrollments.controller";
import { EnrollmentsService } from "./enrollments.service";
import { Enrollment, EnrollmentSchema } from "./schemas/enrollment.schema";
import { ReferralModule } from "../referrals/referral.module";
import {
  ReferralUsage,
  ReferralUsageSchema,
} from "../referrals/schemas/referral-usage.schema";
import { WalletModule } from "../wallet/wallet.module";
@Module({
imports: [

  AuthModule,

  CoursesModule,

  ReferralModule,
WalletModule,
 MongooseModule.forFeature([

  {
    name: Enrollment.name,
    schema: EnrollmentSchema,
  },

  {
    name: ReferralUsage.name,
    schema: ReferralUsageSchema,
  },

]),

],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}