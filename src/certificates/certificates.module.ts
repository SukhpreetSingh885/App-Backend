import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../common/guards/roles.guard";
import { CoursesModule } from "../courses/courses.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import {
  Lesson,
  LessonSchema,
} from "../lessons/schemas/lesson.schema";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import {
  Progress,
  ProgressSchema,
} from "../progress/schemas/progress.schema";
import {
  CertificatesController,
  CertificateVerificationController,
} from "./certificates.controller";
import { CertificatesService } from "./certificates.service";
import {
  Certificate,
  CertificateSchema,
} from "./schemas/certificate.schema";

@Module({
  imports: [
    AuthModule,
    CoursesModule,
    EnrollmentsModule,
    NotificationsModule,
    UsersModule,
    MongooseModule.forFeature([
      {
        name: Certificate.name,
        schema: CertificateSchema,
      },
      {
        name: Lesson.name,
        schema: LessonSchema,
      },
      {
        name: Progress.name,
        schema: ProgressSchema,
      },
    ]),
  ],
  controllers: [
    CertificatesController,
    CertificateVerificationController,
  ],
  providers: [
    CertificatesService,
    RolesGuard,
  ],
  exports: [CertificatesService],
})
export class CertificatesModule {}
