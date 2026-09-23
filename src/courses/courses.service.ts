import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Lesson as LessonDocument } from "../lessons/schemas/lesson.schema";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { CourseStatus } from "./interfaces/course.interface";
import { Course as CourseDocument } from "./schemas/course.schema";

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(CourseDocument.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(LessonDocument.name)
    private readonly lessonModel: Model<LessonDocument>,
  ) {}

  async create(dto: CreateCourseDto) {
    return this.courseModel.create({
      ...dto,
      status: dto.status ?? CourseStatus.Draft,
    });
  }

  async findAll(options?: { includeDrafts?: boolean }) {
    if (options?.includeDrafts) {
      return this.courseModel.find().exec();
    }

    const courses = await this.courseModel
      .find({ status: CourseStatus.Published })
      .lean()
      .exec();

    return courses.map((course: any) => ({
      ...course,
      id: course._id.toString(),
      modules: (course.modules ?? []).map((module: any) => ({
        ...module,
        lessons: (module.lessons ?? []).map((lesson: any) =>
          this.toPublicLesson(lesson),
        ),
      })),
    }));
  }

  async findOne(id: string, includeDraft = false) {
    return this.findOneWithLessonMapper(
      id,
      includeDraft,
      (lesson) => this.toPublicLesson(lesson),
    );
  }

  async findOneForLearning(id: string) {
    return this.findOneWithLessonMapper(
      id,
      false,
      (lesson) => this.toLearningLesson(lesson),
    );
  }

  private async findOneWithLessonMapper(
    id: string,
    includeDraft: boolean,
    mapLesson: (lesson: any) => Record<string, unknown>,
  ) {
    const course = await this.getDocument(id, includeDraft);

    const lessons = await this.lessonModel
      .find({ courseId: id })
      .sort({ order: 1 })
      .lean()
      .exec();

    const courseData = course.toObject();
    const embeddedModules = (courseData.modules ?? []).map((module: any) => ({
      ...module,
      lessons: (module.lessons ?? []).map(mapLesson),
    }));

    const modules = lessons.length > 0
      ? [
          {
            id: `${id}-lessons`,
            title: "Course Lessons",
            lessons: lessons.map((lesson: any) => mapLesson({
              ...lesson,
              id: lesson._id.toString(),
            })),
          },
        ]
      : embeddedModules;

    const lessonCount = lessons.length > 0
      ? lessons.length
      : modules.reduce(
          (total: number, module: any) => total + (module.lessons?.length ?? 0),
          0,
        );

    return {
      ...courseData,
      id: course._id.toString(),
      lessons: lessonCount,
      modules,
    };
  }

  async getDocument(id: string, includeDraft = false) {
    const filter: { _id: string | Types.ObjectId; status?: CourseStatus } = {
      _id: id,
    };

    if (!includeDraft) {
      filter.status = CourseStatus.Published;
    }

    const course = await this.courseModel.findOne(filter).exec();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course;
  }

  async exists(id: string): Promise<boolean> {
    const course = await this.courseModel.exists({ _id: id });
    return !!course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    const course = await this.courseModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course;
  }

  async publish(id: string) {
    return this.update(id, { status: CourseStatus.Published });
  }

  async remove(id: string) {
    const course = await this.courseModel.findByIdAndDelete(id).exec();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return { message: "Course deleted successfully" };
  }

  private toPublicLesson(lesson: any) {
    const isPreview = lesson.isPreview ?? false;
    const publicLesson: Record<string, unknown> = {
      id: lesson.id ?? lesson._id?.toString(),
      title: lesson.title,
      duration: lesson.duration,
      isPreview,
    };

    if (isPreview && lesson.videoUrl) {
      publicLesson.videoUrl = lesson.videoUrl;
    }

    return publicLesson;
  }

  private toLearningLesson(lesson: any) {
    return {
      ...this.toPublicLesson(lesson),
      ...(lesson.videoUrl ? { videoUrl: lesson.videoUrl } : {}),
    };
  }
}
