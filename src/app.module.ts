import { Module } from "@nestjs/common";
import {
  ConfigModule,
  ConfigService,
} from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

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
import { VerificationModule } from "./verification/verification.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        config: ConfigService,
      ) => ({
        uri: config.getOrThrow<string>(
          "MONGODB_URI",
        ),
      }),
    }),

    AuthModule,
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
  ],
})
export class AppModule {}