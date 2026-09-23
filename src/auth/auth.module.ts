import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";

import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { MongooseModule } from "@nestjs/mongoose";
import { ReferralModule } from "../referrals/referral.module";
import {
  ReferralCode,
  ReferralCodeSchema,
} from "../referrals/schemas/referral-code.schema";

import {
  ReferralUsage,
  ReferralUsageSchema,
} from "../referrals/schemas/referral-usage.schema";
@Module({
  imports: [
    forwardRef(() => UsersModule),
    ReferralModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN", "7d") as any },
      }),
    }),
    MongooseModule.forFeature([
  {
    name: ReferralCode.name,
    schema: ReferralCodeSchema,
  },
  {
    name: ReferralUsage.name,
    schema: ReferralUsageSchema,
  },
]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}
