import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { LessonsModule } from "../lessons/lessons.module";

import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";
import { Progress, ProgressSchema } from "./schemas/progress.schema";
import { CertificatesModule } from "../certificates/certificates.module";

@Module({
  imports: [
    AuthModule,
    EnrollmentsModule,
    LessonsModule,
    CertificatesModule,
    MongooseModule.forFeature([
      {
        name: Progress.name,
        schema: ProgressSchema,
      },
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
