import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { EnrollmentsService } from "../enrollments/enrollments.service";
import { LessonsService } from "../lessons/lessons.service";
import { UpdateProgressDto } from "./dto/update-progress.dto";
import { Progress as ProgressDocument } from "./schemas/progress.schema";

@Injectable()
export class ProgressService {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly lessonsService: LessonsService,

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

    let record =
      await this.progressModel.findOne({
        userId,
        courseId,
        lessonId,
      });

    if (!record) {
      record = new this.progressModel({
        userId,
        courseId,
        lessonId,
        completed: false,
        lastWatchedPosition: 0,
      });
    }

    if (dto.completed !== undefined) {
      record.completed = dto.completed;
    }

    if (
      dto.lastWatchedPosition !==
      undefined
    ) {
      record.lastWatchedPosition =
        dto.lastWatchedPosition;
    }

    return record.save();
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
}