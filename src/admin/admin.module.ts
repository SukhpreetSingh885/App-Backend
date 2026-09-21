import { Module } from "@nestjs/common";

import { CoursesModule } from "../courses/courses.module";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { LessonsModule } from "../lessons/lessons.module";
import { PaymentsModule } from "../payments/payments.module";
import { ProgressModule } from "../progress/progress.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    LessonsModule,
    ProgressModule,
    PaymentsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
