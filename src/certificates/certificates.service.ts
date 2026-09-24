import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomBytes } from "crypto";
import {
  isValidObjectId,
  Model,
  Types,
} from "mongoose";

import { CoursesService } from "../courses/courses.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";
import { Lesson } from "../lessons/schemas/lesson.schema";
import { NotificationsService } from "../notifications/notifications.service";
import {
  NotificationRecipientType,
  NotificationType,
} from "../notifications/schemas/notification.schema";
import { Progress } from "../progress/schemas/progress.schema";
import { UsersService } from "../users/users.service";
import { createCertificatePdf } from "./certificate-pdf";
import {
  Certificate,
  CertificateDocument,
} from "./schemas/certificate.schema";

@Injectable()
export class CertificatesService {
  private readonly logger =
    new Logger(CertificatesService.name);

  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService:
      EnrollmentsService,
    private readonly notificationsService:
      NotificationsService,
    private readonly usersService: UsersService,

    @InjectModel(Certificate.name)
    private readonly certificateModel:
      Model<CertificateDocument>,

    @InjectModel(Lesson.name)
    private readonly lessonModel:
      Model<Lesson>,

    @InjectModel(Progress.name)
    private readonly progressModel:
      Model<Progress>,
  ) {}

  async issueIfEligible(
    studentId: string,
    courseId: string,
  ) {
    const ids = this.toIds(
      studentId,
      courseId,
    );

    const existing =
      await this.certificateModel
        .findOne(ids)
        .exec();

    if (existing) {
      return existing;
    }

    await this.enrollmentsService.requireActive(
      studentId,
      courseId,
    );

    const course =
      await this.coursesService.getDocument(
        courseId,
      );

    const lessons = await this.lessonModel
      .find({ courseId })
      .select("_id")
      .lean()
      .exec();

    if (!lessons.length) {
      return null;
    }

    const lessonIds = lessons.map((lesson) =>
      lesson._id.toString(),
    );

    const completedLessonIds =
      await this.progressModel.distinct(
        "lessonId",
        {
          userId: studentId,
          courseId,
          lessonId: { $in: lessonIds },
          completed: true,
        },
      );

    const completed = new Set(
      completedLessonIds.map(String),
    );

    if (
      !lessonIds.every((lessonId) =>
        completed.has(lessonId),
      )
    ) {
      return null;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const certificate =
          await this.certificateModel.create({
            ...ids,
            certificateNumber:
              this.generateCertificateNumber(),
            issuedAt: new Date(),
          });

        await this.notifyStudent(
          studentId,
          courseId,
          course.title,
          certificate._id.toString(),
        );

        return certificate;
      } catch (error) {
        if (!this.isDuplicateKeyError(error)) {
          throw error;
        }

        const concurrentCertificate =
          await this.certificateModel
            .findOne(ids)
            .exec();

        if (concurrentCertificate) {
          return concurrentCertificate;
        }
      }
    }

    throw new InternalServerErrorException(
      "Unable to issue certificate",
    );
  }

  async findForStudent(studentId: string) {
    return this.certificateModel
      .find({
        studentId:
          this.toObjectId(studentId),
      })
      .sort({ issuedAt: -1 })
      .lean()
      .exec();
  }

  async findForCourse(
    studentId: string,
    courseId: string,
  ) {
    const certificate =
      await this.certificateModel
        .findOne(
          this.toIds(studentId, courseId),
        )
        .lean()
        .exec();

    if (!certificate) {
      throw new NotFoundException(
        "Certificate not found",
      );
    }

    return certificate;
  }

  async generatePdfForStudent(
    studentId: string,
    certificateId: string,
  ) {
    if (!isValidObjectId(certificateId)) {
      throw new NotFoundException(
        "Certificate not found",
      );
    }

    const certificate =
      await this.certificateModel
        .findOne({
          _id: certificateId,
          studentId:
            this.toObjectId(studentId),
        })
        .lean()
        .exec();

    if (!certificate) {
      throw new NotFoundException(
        "Certificate not found",
      );
    }

    const [student, course] =
      await Promise.all([
        this.usersService.findById(studentId),
        this.coursesService.getDocument(
          certificate.courseId.toString(),
          true,
        ),
      ]);

    const buffer = await createCertificatePdf({
      studentName: student.name,
      courseTitle: course.title,
      certificateNumber:
        certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
    });

    return {
      buffer,
      fileName:
        `viralstan-certificate-${certificate.certificateNumber}.pdf`,
    };
  }

  async verify(certificateNumber: string) {
    const normalizedNumber =
      certificateNumber.trim().toUpperCase();

    const certificate =
      await this.certificateModel
        .findOne({
          certificateNumber: normalizedNumber,
        })
        .lean()
        .exec();

    if (!certificate) {
      return {
        valid: false,
        certificateNumber: normalizedNumber,
      };
    }

    const [student, course] =
      await Promise.all([
        this.usersService.findById(
          certificate.studentId.toString(),
        ),
        this.coursesService.getDocument(
          certificate.courseId.toString(),
          true,
        ),
      ]);

    return {
      valid: true,
      certificateNumber:
        certificate.certificateNumber,
      studentName: student.name,
      courseTitle: course.title,
      issuedAt: certificate.issuedAt,
    };
  }

  private async notifyStudent(
    studentId: string,
    courseId: string,
    courseTitle: string,
    certificateId: string,
  ) {
    try {
      await this.notificationsService.create({
        recipientId: studentId,
        recipientType:
          NotificationRecipientType.Student,
        type:
          NotificationType.CertificateAvailable,
        title: "Certificate Available",
        message:
          `Congratulations! Your certificate for ${courseTitle} is now available.`,
        data: { courseId, certificateId },
        eventKey:
          `certificate-available:${certificateId}`,
      });
    } catch (error) {
      this.logger.error(
        "Failed to create certificate notification",
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }

  private toIds(
    studentId: string,
    courseId: string,
  ) {
    return {
      studentId: this.toObjectId(studentId),
      courseId: this.toObjectId(courseId),
    };
  }

  private toObjectId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        "Certificate not found",
      );
    }

    return new Types.ObjectId(id);
  }

  private generateCertificateNumber() {
    const year = new Date().getUTCFullYear();
    const random = randomBytes(6)
      .toString("hex")
      .toUpperCase();

    return `VSA-${year}-${random}`;
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
