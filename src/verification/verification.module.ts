import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";

import {
  Verification,
  VerificationSchema,
} from "./schemas/verification.schema";

import { VerificationController } from "./verification.controller";
import { VerificationService } from "./verification.service";

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: Verification.name,
        schema: VerificationSchema,
      },
    ]),
  ],

  controllers: [
    VerificationController,
  ],

  providers: [
    VerificationService,
  ],

  exports: [
    VerificationService,
  ],
})
export class VerificationModule {}