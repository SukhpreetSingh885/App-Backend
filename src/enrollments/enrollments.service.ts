import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoursesService } from "../courses/courses.service";
import { ReferralService } from "../referrals/referral.service";
import { WalletService } from "../wallet/wallet.service";
import { UserRole } from "../common/enums/user-role.enum";
import { NotificationsService } from "../notifications/notifications.service";
import {
  NotificationRecipientType,
  NotificationType,
} from "../notifications/schemas/notification.schema";
import { UsersService } from "../users/users.service";

import {
  ReferralUsage,
  ReferralUsageDocument,
  ReferralUsageStatus,
} from "../referrals/schemas/referral-usage.schema";

import { EnrollmentStatus } from "./interfaces/enrollment.interface";
import { Enrollment as EnrollmentDocument } from "./schemas/enrollment.schema";


@Injectable()
export class EnrollmentsService {

  private readonly logger =
    new Logger(EnrollmentsService.name);


  constructor(

    private readonly coursesService: CoursesService,

    private readonly referralService: ReferralService,

    private readonly walletService: WalletService,

    private readonly usersService: UsersService,

    private readonly notificationsService:
      NotificationsService,


    @InjectModel(ReferralUsage.name)
    private readonly referralUsageModel:
      Model<ReferralUsageDocument>,


    @InjectModel(EnrollmentDocument.name)
    private readonly enrollmentModel:
      Model<EnrollmentDocument>,

  ) { }



  async enrollFree(
    userId: string,
    courseId: string,
  ) {

    const course =
      await this.coursesService.getDocument(
        courseId,
      );


    if (course.price > 0) {

      throw new BadRequestException(
        "Paid courses can only be enrolled after successful payment",
      );

    }


    const existing =
      await this.enrollmentModel.findOne({
        userId,
        courseId,
      });



    if (
      existing &&
      existing.status !== EnrollmentStatus.Cancelled
    ) {

      throw new ConflictException(
        "Already enrolled in this course",
      );

    }



    if (existing) {

      existing.status =
        EnrollmentStatus.Active;


      existing.enrollmentDate =
        new Date();


      const updatedEnrollment =
        await existing.save();


      await this.referralService
        .createReferralCodes(userId);


      await this.processReferralReward(
        userId,
      );


      return updatedEnrollment;

    }



    const enrollment =
      await this.enrollmentModel.create({

        userId,

        courseId,

        enrollmentDate: new Date(),

        status: EnrollmentStatus.Active,

      });

    await this.notifyEnrollmentCreated(
      userId,
      courseId,
      course.title,
      enrollment._id.toString(),
    );



    await this.referralService
      .createReferralCodes(userId);



    await this.processReferralReward(
      userId,
    );


    return enrollment;

  }




  async enrollFromPayment(
    userId: string,
    courseId: string,
    paymentIntentId: string,
  ) {


    const course =
      await this.coursesService.getDocument(
        courseId,
      );



    const existingByPayment =
      await this.enrollmentModel.findOne({

        sourcePaymentIntentId:
          paymentIntentId,

      });



    if (existingByPayment) {

      return existingByPayment;

    }



    const existing =
      await this.enrollmentModel.findOne({

        userId,

        courseId,

      });



    if (existing) {


      existing.status =
        EnrollmentStatus.Active;



      existing.enrollmentDate =
        existing.enrollmentDate ??
        new Date();



      existing.sourcePaymentIntentId =
        paymentIntentId;



      const updatedEnrollment =
        await existing.save();



      await this.referralService
        .createReferralCodes(userId);



      await this.processReferralReward(
        userId,
      );


      return updatedEnrollment;

    }



    const enrollment =
      await this.enrollmentModel.create({

        userId,

        courseId,

        enrollmentDate: new Date(),

        status: EnrollmentStatus.Active,

        sourcePaymentIntentId:
          paymentIntentId,

      });

    await this.notifyEnrollmentCreated(
      userId,
      courseId,
      course.title,
      enrollment._id.toString(),
    );



    await this.referralService
      .createReferralCodes(userId);



    await this.processReferralReward(
      userId,
    );



    return enrollment;

  }



private async processReferralReward(
  studentId: string,
) {
  const referral =
    await this.referralUsageModel.findOne({
      referredStudentId: studentId,
      status: ReferralUsageStatus.Pending,
      rewardGiven: false,
    });

  if (!referral) {
    return;
  }

  const rewardAmount =
    referral.rewardAmount;

  if (rewardAmount > 0) {
    await this.walletService.addCredit(
      referral.referrerId.toString(),
      rewardAmount,
      "Referral reward",
      `referral:${referral._id.toString()}`,
    );

    await this.notifyReferralReward(
      referral.referrerId.toString(),
      referral._id.toString(),
      rewardAmount,
    );
  }

  await this.referralUsageModel.updateOne(
    {
      _id: referral._id,
      status: ReferralUsageStatus.Pending,
      rewardGiven: false,
    },
    {
      $set: {
        status:
          ReferralUsageStatus.Completed,
        rewardGiven: true,
      },
    },
  );
}

private async notifyEnrollmentCreated(
  studentId: string,
  courseId: string,
  courseTitle: string,
  enrollmentId: string,
) {
  try {
    const [student, adminIds] =
      await Promise.all([
        this.usersService.findById(studentId),
        this.usersService.findIdsByRole(
          UserRole.Admin,
        ),
      ]);

    const eventKey =
      `enrollment:${enrollmentId}`;

    await this.notificationsService.createMany([
      {
        recipientId: studentId,
        recipientType:
          NotificationRecipientType.Student,
        type:
          NotificationType.EnrollmentSuccessful,
        title: "Enrollment Successful",
        message:
          `You are now enrolled in ${courseTitle}.`,
        data: { courseId, enrollmentId },
        eventKey,
      },
      ...adminIds.map((adminId) => ({
        recipientId: adminId,
        recipientType:
          NotificationRecipientType.Admin,
        type: NotificationType.NewEnrollment,
        title: "New Enrollment",
        message:
          `${student.name} enrolled in ${courseTitle}.`,
        data: {
          courseId,
          enrollmentId,
          studentId,
        },
        eventKey,
      })),
    ]);
  } catch (error) {
    this.logger.error(
      "Failed to create enrollment notifications",
      error instanceof Error
        ? error.stack
        : String(error),
    );
  }
}

private async notifyReferralReward(
  referrerId: string,
  referralUsageId: string,
  rewardAmount: number,
) {
  try {
    await this.notificationsService.create({
      recipientId: referrerId,
      recipientType:
        NotificationRecipientType.Student,
      type: NotificationType.ReferralReward,
      title: "Referral Reward",
      message:
        `₹${rewardAmount.toLocaleString("en-IN")} referral reward was added to your wallet.`,
      data: {
        amount: rewardAmount,
        referralUsageId,
      },
      eventKey:
        `referral-reward:${referralUsageId}`,
    });
  } catch (error) {
    this.logger.error(
      "Failed to create referral reward notification",
      error instanceof Error
        ? error.stack
        : String(error),
    );
  }
}

  async findForUser(
    userId: string,
  ) {


    const enrollments =
      await this.enrollmentModel.find({

        userId,

        status: {
          $ne:
            EnrollmentStatus.Cancelled,
        },

      });



    return Promise.all(

      enrollments.map(

        async (enrollment) => ({

          enrollment,

          course:
            await this.coursesService.findOne(
              enrollment.courseId,
              true,
            ),

        }),

      ),

    );

  }




  async findAll() {

    return this.enrollmentModel.find();

  }




  async requireActive(
    userId: string,
    courseId: string,
  ) {


    const enrollment =
      await this.enrollmentModel.findOne({

        userId,

        courseId,

        status: {
          $ne:
            EnrollmentStatus.Cancelled,
        },

      });



    if (!enrollment) {

      throw new NotFoundException(
        "Active enrollment not found",
      );

    }



    return enrollment;

  }

  async findCourseForLearning(
    userId: string,
    courseId: string,
  ) {
    await this.requireActive(userId, courseId);
    return this.coursesService.findOneForLearning(courseId);
  }

}
