
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { LessonsModule } from "./lessons/lessons.module";
import { PaymentsModule } from "./payments/payments.module";
import { ProgressModule } from "./progress/progress.module";
import { UploadsModule } from "./uploads/uploads.module";
import { UsersModule } from "./users/users.module";
import { AdminSecurityModule } from "./admin-security/admin-security.module";
import { AuthSecurityModule } from "./auth-security/auth-security.module";
import { VerificationModule } from "./verification/verification.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { WithdrawalsModule } from "./withdrawals/withdrawals.module";
import { RedisModule } from "./redis/redis.module";
import { BullModule } from "@nestjs/bullmq";
import { HealthModule } from "./health/health.module";
@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000,
        limit: 120,
      },
    ]),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>("MONGODB_URI"),
      }),
    }),
    RedisModule,
BullModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.getOrThrow<string>("REDIS_HOST"),
      port: Number(
        config.getOrThrow<string>("REDIS_PORT"),
      ),
    },
  }),
}),
    AuthModule,
    AuthSecurityModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    EnrollmentsModule,
    ProgressModule,
    AdminModule,
    PaymentsModule,
    UploadsModule,
    AdminSecurityModule,
    VerificationModule,
    NotificationsModule,
    CertificatesModule,
    WithdrawalsModule,
    HealthModule,
  ],


  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
