import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { MailModule } from "../mail/mail.module";
import { UsersModule } from "../users/users.module";

import { AdminOtpService } from "./admin-otp.service";
import { AdminSecurityController } from "./admin-security.controller";

import {
  AdminOtp,
  AdminOtpSchema,
} from "./schemas/admin-otp.schema";


@Module({
  imports: [
    MailModule,
    UsersModule,

    MongooseModule.forFeature([
      {
        name: AdminOtp.name,
        schema: AdminOtpSchema,
      },
    ]),
  ],

  controllers: [
    AdminSecurityController,
  ],

  providers: [
    AdminOtpService,
  ],

  exports: [
    AdminOtpService,
  ],
})
export class AdminSecurityModule {}