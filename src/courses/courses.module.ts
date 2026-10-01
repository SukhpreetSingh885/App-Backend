import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditModule } from "../audit/audit.module";
import { CoursesController } from "./courses.controller";
import { CoursesService } from "./courses.service";
import { Course, CourseSchema } from "./schemas/course.schema";
import { RolesGuard } from "../common/guards/roles.guard";
import { Lesson, LessonSchema } from "../lessons/schemas/lesson.schema";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    NotificationsModule,
  UsersModule,
  AuditModule,
    MongooseModule.forFeature([
      {
        name: Course.name,
        schema: CourseSchema,
      },
      {
        name: Lesson.name,
        schema: LessonSchema,
      },
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService, RolesGuard],
  exports: [CoursesService],
})
export class CoursesModule {}
