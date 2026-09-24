import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { EnrollmentsService } from "../enrollments/enrollments.service";
import { LessonsService } from "../lessons/lessons.service";
import { UpdateProgressDto } from "./dto/update-progress.dto";
import { Progress as ProgressDocument } from "./schemas/progress.schema";
import { CertificatesService } from "../certificates/certificates.service";

@Injectable()
export class ProgressService {
  private readonly logger =
    new Logger(ProgressService.name);

  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly lessonsService: LessonsService,
    private readonly certificatesService:
      CertificatesService,

    @InjectModel(ProgressDocument.name)
    private readonly progressModel: Model<ProgressDocument>,
  ) {}

  async update(
    userId: string,
    courseId: string,
    lessonId: string,
    dto: UpdateProgressDto,
  ) {
    await this.enrollmentsService.requireActive(
      userId,
      courseId,
    );

    const lesson =
      await this.lessonsService.findOne(
        lessonId,
      );

    if (lesson.courseId !== courseId) {
      throw new BadRequestException(
        "Lesson does not belong to this course",
      );
    }

    const changes: Record<string, boolean | number> = {};

    if (dto.completed !== undefined) {
      changes.completed = dto.completed;
    }

    if (
      dto.lastWatchedPosition !==
      undefined
    ) {
      changes.lastWatchedPosition =
        dto.lastWatchedPosition;
    }

    const filter = {
      userId,
      courseId,
      lessonId,
    };

    let savedRecord;

    try {
      savedRecord = await this.progressModel
        .findOneAndUpdate(
          filter,
          { $set: changes },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) {
        throw error;
      }

      savedRecord = await this.progressModel
        .findOneAndUpdate(
          filter,
          { $set: changes },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();
    }

    if (!savedRecord) {
      throw new Error(
        "Progress record could not be saved",
      );
    }

    if (dto.completed === true) {
      try {
        await this.certificatesService
          .issueIfEligible(userId, courseId);
      } catch (error) {
        this.logger.error(
          "Automatic certificate issuance failed",
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }

    return savedRecord;
  }

  async complete(
    userId: string,
    courseId: string,
    lessonId: string,
  ) {
    return this.update(
      userId,
      courseId,
      lessonId,
      {
        completed: true,
        lastWatchedPosition: 0,
      },
    );
  }

  async findForUser(
    userId: string,
    courseId?: string,
  ) {
    return this.progressModel.find({
      userId,
      ...(courseId && {
        courseId,
      }),
    });
  }

  async resetForCourse(
    userId: string,
    courseId: string,
  ) {
    return this.progressModel.deleteMany({
      userId,
      courseId,
    });
  }

  async findAll() {
    return this.progressModel.find();
  }

  private isDuplicateKeyError(
    error: unknown,
  ): error is { code: number } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    );
  }
}
