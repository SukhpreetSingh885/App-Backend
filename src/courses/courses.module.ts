import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CoursesController } from "./courses.controller";
import { CoursesService } from "./courses.service";
import { Course, CourseSchema } from "./schemas/course.schema";
import { RolesGuard } from "../common/guards/roles.guard";
import { Lesson, LessonSchema } from "../lessons/schemas/lesson.schema";

@Module({
  imports: [
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
