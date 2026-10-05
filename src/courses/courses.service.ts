import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { AuditService } from "../audit/audit.service";
import { Lesson as LessonDocument } from "../lessons/schemas/lesson.schema";
import { UserRole } from "../common/enums/user-role.enum";
import { NotificationsService } from "../notifications/notifications.service";
import {
  NotificationRecipientType,
  NotificationType,
} from "../notifications/schemas/notification.schema";
import { UsersService } from "../users/users.service";

import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { CourseStatus } from "./interfaces/course.interface";
import { Course as CourseDocument } from "./schemas/course.schema";
import { CourseQueryDto } from "./dto/course-query.dto";

@Injectable()
export class CoursesService {
  private readonly logger =
    new Logger(CoursesService.name);

  private readonly coursesCacheKey =
    "courses:published";

  constructor(
    @InjectModel(CourseDocument.name)
    private readonly courseModel:
      Model<CourseDocument>,

    @InjectModel(LessonDocument.name)
    private readonly lessonModel:
      Model<LessonDocument>,

    private readonly usersService:
      UsersService,

    private readonly notificationsService:
      NotificationsService,

    private readonly auditService:
      AuditService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateCourseDto) {
    const course =
      await this.courseModel.create({
        ...dto,
        status:
          dto.status ??
          CourseStatus.Draft,
      });

    await this.invalidateCoursesCache();

    return course;
  }

  async findAll(
    options?: {
      includeDrafts?: boolean;
    },
  ) {
    if (options?.includeDrafts) {
      return this.courseModel
        .find()
        .exec();
    }

    return this.findAllPaginated({
      page: 1,
      limit: 20,
    });
  }

  async findAllPaginated(
    query: CourseQueryDto,
  ) {
    const page =
      query.page ?? 1;

    const limit =
      query.limit ?? 20;

    const skip =
      (page - 1) * limit;

    const cacheKey =
      `${this.coursesCacheKey}:page:${page}:limit:${limit}`;

    const cached =
      await this.cacheManager.get<{
        data: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      }>(cacheKey);

    if (cached) {
      console.log(
        "REDIS CACHE HIT:",
        cacheKey,
      );

      return cached;
    }

    console.log(
      "REDIS CACHE MISS:",
      cacheKey,
    );

    const filter = {
      status:
        CourseStatus.Published,
    };

    const [courses, total] =
      await Promise.all([
        this.courseModel
          .find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),

        this.courseModel
          .countDocuments(filter)
          .exec(),
      ]);

    const data =
      courses.map(
        (course: any) => ({
          ...course,

          id:
            course._id.toString(),

          modules:
            (course.modules ?? [])
              .map(
                (module: any) => ({
                  ...module,

                  lessons:
                    (module.lessons ?? [])
                      .map(
                        (lesson: any) =>
                          this.toPublicLesson(
                            lesson,
                          ),
                      ),
                }),
              ),
        }),
      );

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total / limit,
          );

    const result = {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    };

    await this.cacheManager.set(
      cacheKey,
      result,
      5 * 60 * 1000,
    );

    return result;
  }

async findOne(
  id: string,
  includeDraft = false,
) {
  if (includeDraft) {
    return this.findOneWithLessonMapper(
      id,
      true,
      (lesson) =>
        this.toPublicLesson(
          lesson,
        ),
    );
  }

  const cacheKey =
    `course:published:${id}`;

  const cached =
    await this.cacheManager.get<any>(
      cacheKey,
    );

  if (cached) {
    console.log(
      "REDIS CACHE HIT:",
      cacheKey,
    );

    return cached;
  }

  console.log(
    "REDIS CACHE MISS:",
    cacheKey,
  );

  const result =
    await this.findOneWithLessonMapper(
      id,
      false,
      (lesson) =>
        this.toPublicLesson(
          lesson,
        ),
    );

  await this.cacheManager.set(
    cacheKey,
    result,
    5 * 60 * 1000,
  );

  return result;
}

  async findOneForLearning(
    id: string,
  ) {
    return this.findOneWithLessonMapper(
      id,
      false,
      (lesson) =>
        this.toLearningLesson(
          lesson,
        ),
    );
  }

  private async findOneWithLessonMapper(
    id: string,
    includeDraft: boolean,
    mapLesson: (
      lesson: any,
    ) => Record<string, unknown>,
  ) {
    const course =
      await this.getDocument(
        id,
        includeDraft,
      );

    const lessons =
      await this.lessonModel
        .find({ courseId: id })
        .sort({ order: 1 })
        .lean()
        .exec();

    const courseData =
      course.toObject();

    const embeddedModules =
      (courseData.modules ?? [])
        .map((module: any) => ({
          ...module,

          lessons:
            (module.lessons ?? [])
              .map(mapLesson),
        }));

    const modules =
      lessons.length > 0
        ? [
            {
              id:
                `${id}-lessons`,

              title:
                "Course Lessons",

              lessons:
                lessons.map(
                  (lesson: any) =>
                    mapLesson({
                      ...lesson,
                      id:
                        lesson._id.toString(),
                    }),
                ),
            },
          ]
        : embeddedModules;

    const lessonCount =
      lessons.length > 0
        ? lessons.length
        : modules.reduce(
            (
              total: number,
              module: any,
            ) =>
              total +
              (
                module.lessons
                  ?.length ?? 0
              ),
            0,
          );

    return {
      ...courseData,

      id:
        course._id.toString(),

      lessons:
        lessonCount,

      modules,
    };
  }

  async getDocument(
    id: string,
    includeDraft = false,
  ) {
    const filter: {
      _id:
        | string
        | Types.ObjectId;

      status?: CourseStatus;
    } = {
      _id: id,
    };

    if (!includeDraft) {
      filter.status =
        CourseStatus.Published;
    }

    const course =
      await this.courseModel
        .findOne(filter)
        .exec();

    if (!course) {
      throw new NotFoundException(
        "Course not found",
      );
    }

    return course;
  }

  async exists(
    id: string,
  ): Promise<boolean> {
    const course =
      await this.courseModel
        .exists({ _id: id });

    return !!course;
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
  ) {
    const previousCourse =
      dto.status ===
      CourseStatus.Published
        ? await this.courseModel
            .findById(id)
            .select("status")
            .lean()
            .exec()
        : null;

    const course =
      await this.courseModel
        .findByIdAndUpdate(
          id,
          {
            ...dto,
            updatedAt:
              new Date(),
          },
          {
            new: true,
          },
        )
        .exec();

    if (!course) {
      throw new NotFoundException(
        "Course not found",
      );
    }

    await this.invalidateCoursesCache();

    if (
      previousCourse &&
      previousCourse.status !==
        CourseStatus.Published &&
      course.status ===
        CourseStatus.Published
    ) {
      await this.notifyStudentsOfPublishedCourse(
        course._id.toString(),
        course.title,
      );
    }

    return course;
  }

  async publish(
    id: string,
  ) {
    return this.update(
      id,
      {
        status:
          CourseStatus.Published,
      },
    );
  }

  async remove(
    id: string,
  ) {
    const course =
      await this.courseModel
        .findByIdAndDelete(id)
        .exec();

    if (!course) {
      throw new NotFoundException(
        "Course not found",
      );
    }

    await this.invalidateCoursesCache();

    return {
      message:
        "Course deleted successfully",
    };
  }

  private async invalidateCoursesCache() {
    await this.cacheManager.clear();
  }

  private toPublicLesson(
    lesson: any,
  ) {
    const isPreview =
      lesson.isPreview ??
      false;

    const publicLesson:
      Record<string, unknown> = {
      id:
        lesson.id ??
        lesson._id?.toString(),

      title:
        lesson.title,

      category:
        lesson.category ??
        "Development",

      duration:
        lesson.duration,

      isPreview,
    };

    if (
      isPreview &&
      lesson.videoUrl
    ) {
      publicLesson.videoUrl =
        lesson.videoUrl;
    }

    return publicLesson;
  }

  private toLearningLesson(
    lesson: any,
  ) {
    return {
      ...this.toPublicLesson(
        lesson,
      ),

      ...(lesson.videoUrl
        ? {
            videoUrl:
              lesson.videoUrl,
          }
        : {}),
    };
  }

  private async notifyStudentsOfPublishedCourse(
    courseId: string,
    courseTitle: string,
  ) {
    try {
      const studentIds =
        await this.usersService
          .findIdsByRole(
            UserRole.Student,
          );

      await this.notificationsService
        .createMany(
          studentIds.map(
            (studentId) => ({
              recipientId:
                studentId,

              recipientType:
                NotificationRecipientType.Student,

              type:
                NotificationType.CoursePublished,

              title:
                "New Course Available",

              message:
                `${courseTitle} is now available.`,

              data: {
                courseId,
              },

              eventKey:
                `course-published:${courseId}`,
            }),
          ),
        );
    } catch (error) {
      this.logger.error(
        "Failed to create course publication notifications",

        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }
}