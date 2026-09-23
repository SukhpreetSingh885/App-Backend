import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoursesService } from "../courses/courses.service";
import { ReferralService } from "../referrals/referral.service";
import { WalletService } from "../wallet/wallet.service";

import {
  ReferralUsage,
  ReferralUsageDocument,
  ReferralUsageStatus,
} from "../referrals/schemas/referral-usage.schema";

import { EnrollmentStatus } from "./interfaces/enrollment.interface";
import { Enrollment as EnrollmentDocument } from "./schemas/enrollment.schema";


@Injectable()
export class EnrollmentsService {


  constructor(

    private readonly coursesService: CoursesService,

    private readonly referralService: ReferralService,

    private readonly walletService: WalletService,


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
      await this.referralUsageModel.findOneAndUpdate(
        {
          referredStudentId: studentId,
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
        {
          new: true,
        },
      );


    if (!referral) {

      return;

    }



    const rewardAmount =
  referral.rewardAmount;

    if (rewardAmount <= 0) {

      return;

    }

    await this.walletService.addCredit(
      referral.referrerId.toString(),
      rewardAmount,
      "Referral reward",
      `referral:${referral._id.toString()}`,
    );

  }

  async revokeFromRefund(
    userId: string,
    courseId: string,
    paymentIntentId: string,
  ) {


    const enrollment =
      await this.enrollmentModel.findOne({

        userId,

        courseId,

        sourcePaymentIntentId:
          paymentIntentId,

      });



    if (!enrollment) {

      return null;

    }



    if (
      enrollment.status ===
      EnrollmentStatus.Cancelled
    ) {

      return enrollment;

    }



    enrollment.status =
      EnrollmentStatus.Cancelled;



    return enrollment.save();

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
