import {
  BadRequestException,
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
    await this.coursesService.getDocument(
      dto.courseId,
      true,
    );

    await this.assertOrderAvailable(
      dto.courseId,
      dto.order,
    );

    this.validateVideo(
      dto.videoSource,
      dto.videoUrl,
      dto.videoPublicId,
    );

    return this.lessonModel.create(dto);
  }

  async findByCourse(
    courseId: string,
    userId: string,
    role: UserRole,
  ) {
    await this.coursesService.getDocument(
      courseId,
      role === UserRole.Admin,
    );

    if (role !== UserRole.Admin) {
      await this.enrollmentsService.requireActive(
        userId,
        courseId,
      );
    }

    return this.lessonModel
      .find({ courseId })
      .sort({ order: 1 })
      .exec();
  }

  async findAll() {
    return this.lessonModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOneForUser(
    id: string,
    userId: string,
    role: UserRole,
  ) {
    const lesson =
      await this.findOne(id);

    if (
      !lesson.isPreview &&
      role !== UserRole.Admin
    ) {
      await this.enrollmentsService.requireActive(
        userId,
        lesson.courseId,
      );
    }

    return lesson;
  }

  async findOne(id: string) {
    const lesson =
      await this.lessonModel
        .findById(id)
        .exec();

    if (!lesson) {
      throw new NotFoundException(
        "Lesson not found",
      );
    }

    return lesson;
  }

  async update(
    id: string,
    dto: UpdateLessonDto,
  ) {
    const lesson =
      await this.findOne(id);

    if (dto.order !== undefined) {
      await this.assertOrderAvailable(
        lesson.courseId,
        dto.order,
        id,
      );
    }

    const videoSource =
      dto.videoSource ??
      lesson.videoSource ??
      "url";

    const videoUrl =
      dto.videoUrl ??
      lesson.videoUrl;

    const videoPublicId =
      dto.videoPublicId ??
      lesson.videoPublicId;

    this.validateVideo(
      videoSource,
      videoUrl,
      videoPublicId,
    );

    const updateData: Record<
      string,
      unknown
    > = {
      ...dto,
      updatedAt: new Date(),
    };

    if (videoSource === "url") {
      delete updateData.videoPublicId;

      return this.lessonModel
        .findByIdAndUpdate(
          id,
          {
            $set: updateData,
            $unset: {
              videoPublicId: 1,
            },
          },
          { new: true },
        )
        .exec();
    }

    return this.lessonModel
      .findByIdAndUpdate(
        id,
        {
          $set: updateData,
        },
        { new: true },
      )
      .exec();
  }

  async changeVideo(
    id: string,
    videoUrl: string,
  ) {
    return this.update(id, {
      videoUrl,
    });
  }

  async remove(id: string) {
    const lesson =
      await this.lessonModel
        .findByIdAndDelete(id)
        .exec();

    if (!lesson) {
      throw new NotFoundException(
        "Lesson not found",
      );
    }

    return {
      message:
        "Lesson deleted successfully",
    };
  }

  private validateVideo(
    videoSource: "upload" | "url",
    videoUrl: string,
    videoPublicId?: string,
  ) {
    if (!videoUrl?.trim()) {
      throw new BadRequestException(
        "Video URL is required",
      );
    }

    if (videoSource === "upload") {
      if (
        !this.isCloudinaryVideo(
          videoUrl,
        )
      ) {
        throw new BadRequestException(
          "Uploaded videos must use a Cloudinary video URL",
        );
      }

      if (!videoPublicId) {
        throw new BadRequestException(
          "Uploaded video public ID is required",
        );
      }

      return;
    }

    if (
      !this.isYouTubeVideo(
        videoUrl,
      ) &&
      !this.isDirectVideo(
        videoUrl,
      )
    ) {
      throw new BadRequestException(
        "Video URL must be a YouTube link or a direct HTTPS MP4/HLS video URL",
      );
    }
  }

  private isYouTubeVideo(
    videoUrl: string,
  ) {
    try {
      const url = new URL(
        videoUrl,
      );

      const host =
        url.hostname
          .toLowerCase()
          .replace(/^www\./, "");

      if (host === "youtu.be") {
        return (
          url.pathname
            .split("/")
            .filter(Boolean)[0]
            ?.length === 11
        );
      }

      if (
        host !== "youtube.com" &&
        host !==
          "m.youtube.com"
      ) {
        return false;
      }

      if (
        url.pathname ===
        "/watch"
      ) {
        return (
          url.searchParams.get(
            "v",
          )?.length === 11
        );
      }

      const match =
        url.pathname.match(
          /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/,
        );

      return Boolean(match);
    } catch {
      return false;
    }
  }

  private isDirectVideo(
    videoUrl: string,
  ) {
    try {
      const url = new URL(
        videoUrl,
      );

      if (
        url.protocol !== "https:"
      ) {
        return false;
      }

      const path =
        url.pathname.toLowerCase();

      return (
        path.endsWith(".mp4") ||
        path.endsWith(".m3u8")
      );
    } catch {
      return false;
    }
  }

  private isCloudinaryVideo(
    videoUrl: string,
  ) {
    try {
      const url = new URL(
        videoUrl,
      );

      return (
        url.protocol ===
          "https:" &&
        url.hostname ===
          "res.cloudinary.com" &&
        url.pathname.includes(
          "/video/upload/",
        )
      );
    } catch {
      return false;
    }
  }

  private async assertOrderAvailable(
    courseId: string,
    order: number,
    ignoredId?: string,
  ) {
    const existingLesson =
      await this.lessonModel.findOne({
        courseId,
        order,
        ...(ignoredId && {
          _id: {
            $ne: ignoredId,
          },
        }),
      });

    if (existingLesson) {
      throw new ConflictException(
        "Lesson order already exists in this course",
      );
    }
  }
}