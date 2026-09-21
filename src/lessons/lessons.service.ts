import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { UserRole } from "../common/enums/user-role.enum";
import { CoursesService } from "../courses/courses.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { Lesson as LessonDocument } from "./schemas/lesson.schema";

@Injectable()
export class LessonsService {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
    @InjectModel(LessonDocument.name)
    private readonly lessonModel: Model<LessonDocument>,
  ) {}

  async create(dto: CreateLessonDto) {
    await this.coursesService.getDocument(dto.courseId, true);
    await this.assertOrderAvailable(dto.courseId, dto.order);
    return this.lessonModel.create(dto);
  }

  async findByCourse(courseId: string, userId: string, role: UserRole) {
    await this.coursesService.getDocument(courseId, role === UserRole.Admin);

    if (role !== UserRole.Admin) {
      await this.enrollmentsService.requireActive(userId, courseId);
    }

    return this.lessonModel.find({ courseId }).sort({ order: 1 }).exec();
  }

  async findAll() {
    return this.lessonModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOneForUser(id: string, userId: string, role: UserRole) {
    const lesson = await this.findOne(id);

    if (!lesson.isPreview && role !== UserRole.Admin) {
      await this.enrollmentsService.requireActive(userId, lesson.courseId);
    }

    return lesson;
  }

  async findOne(id: string) {
    const lesson = await this.lessonModel.findById(id).exec();

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    return lesson;
  }

  async update(id: string, dto: UpdateLessonDto) {
    const lesson = await this.findOne(id);

    if (dto.order !== undefined) {
      await this.assertOrderAvailable(lesson.courseId, dto.order, id);
    }

    return this.lessonModel
      .findByIdAndUpdate(
        id,
        { ...dto, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async changeVideo(id: string, videoUrl: string) {
    return this.update(id, { videoUrl });
  }

  async remove(id: string) {
    const lesson = await this.lessonModel.findByIdAndDelete(id).exec();

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    return { message: "Lesson deleted successfully" };
  }

  private async assertOrderAvailable(
    courseId: string,
    order: number,
    ignoredId?: string,
  ) {
    const existingLesson = await this.lessonModel.findOne({
      courseId,
      order,
      ...(ignoredId && { _id: { $ne: ignoredId } }),
    });

    if (existingLesson) {
      throw new ConflictException(
        "Lesson order already exists in this course",
      );
    }
  }
}
