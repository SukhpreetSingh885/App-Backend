import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import * as bcrypt from "bcrypt";

import { randomInt } from "crypto";

import { Model } from "mongoose";

import { MailService } from "../mail/mail.service";

import {
  AdminOtp,
  AdminOtpDocument,
  AdminOtpPurpose,
} from "./schemas/admin-otp.schema";



@Injectable()
export class AdminOtpService {


  private readonly otpLifetimeMinutes = 5;

  private readonly maxAttempts = 5;



  constructor(

    @InjectModel(AdminOtp.name)
    private readonly adminOtpModel:
      Model<AdminOtpDocument>,


    private readonly mailService:
      MailService,

  ) {}




  // =========================
  // CREATE OTP
  // =========================


  async createOtp(

    adminId: string,

    purpose: AdminOtpPurpose,

    email: string,

  ) {


    await this.adminOtpModel.updateMany(

      {
        adminId,
        purpose,
        used: false,
      },


      {
        $set: {
          used: true,
        },
      },

    );



    const otp =
      randomInt(
        100000,
        1000000,
      ).toString();




    const otpHash =
      await bcrypt.hash(
        otp,
        10,
      );



    const expiresAt =
      new Date(
        Date.now() +
        this.otpLifetimeMinutes *
        60 *
        1000,
      );



    await this.adminOtpModel.create({

      adminId,

      purpose,

      otpHash,

      expiresAt,

      attempts: 0,

      used: false,

      pendingEmail:
        email
          .trim()
          .toLowerCase(),

    });



    await this.mailService.sendOtpEmail(

      email,

      otp,

    );



    return {
      expiresAt,
    };

  }






  // =========================
  // OLD EMAIL OTP
  // =========================


  async createOldEmailChangeOtp(

    adminId: string,

    oldEmail: string,

  ) {


    return this.createOtp(

      adminId,

      AdminOtpPurpose.VerifyOldEmail,

      oldEmail,

    );

  }





  async verifyOldEmailOtp(

    adminId: string,

    otp: string,

  ) {


    const record =
      await this.adminOtpModel

        .findOne({

          adminId,

          purpose:
           AdminOtpPurpose.VerifyOldEmail,

          used: false,

        })

        .sort({

          createdAt: -1,

        })

        .select("+otpHash")

        .exec();




    if (!record) {

      throw new BadRequestException(
        "Verification code not found",
      );

    }





    if (
      record.expiresAt.getTime()
      < Date.now()
    ) {


      record.used = true;

      await record.save();


      throw new BadRequestException(
        "Verification code expired",
      );

    }





    if (
      record.attempts >=
      this.maxAttempts
    ) {


      record.used = true;

      await record.save();


      throw new BadRequestException(
        "Too many attempts",
      );

    }





    const valid =
      await bcrypt.compare(

        otp,

        record.otpHash,

      );





    if (!valid) {


      record.attempts += 1;


      await record.save();



      throw new BadRequestException(
        "Invalid OTP",
      );

    }





    record.emailVerified = true;


    await record.save();




    return {

      valid: true,

    };

  }







  // =========================
  // NEW EMAIL OTP
  // =========================


  async createNewEmailOtp(

    adminId: string,

    newEmail: string,

  ) {



    const oldEmailVerified =
      await this.adminOtpModel.findOne({

        adminId,

        purpose:
          AdminOtpPurpose.VerifyOldEmail,

        emailVerified: true,

      });





    if (!oldEmailVerified) {


      throw new BadRequestException(

        "Old email verification required",

      );

    }





    return this.createOtp(

      adminId,

      AdminOtpPurpose.VerifyNewEmail,

      newEmail,

    );

  }







  // =========================
  // COMMON OTP VERIFY
  // =========================


  async verifyOtp(

    adminId: string,

    purpose: AdminOtpPurpose,

    otp: string,

  ) {



    const record =
      await this.adminOtpModel

        .findOne({

          adminId,

          purpose,

          used: false,

        })

        .sort({

          createdAt: -1,

        })

        .select("+otpHash")

        .exec();





    if (!record) {


      throw new BadRequestException(
        "Verification code not found",
      );

    }






    if (
      record.expiresAt.getTime()
      < Date.now()
    ) {


      record.used = true;

      await record.save();


      throw new BadRequestException(
        "Verification code expired",
      );

    }







    if (
      record.attempts >=
      this.maxAttempts
    ) {


      record.used = true;

      await record.save();



      throw new BadRequestException(
        "Too many attempts",
      );

    }






    const valid =
      await bcrypt.compare(

        otp,

        record.otpHash,

      );






    if (!valid) {


      record.attempts += 1;


      await record.save();



      throw new BadRequestException(
        "Invalid OTP",
      );

    }





    record.used = true;


    await record.save();





    return {

      valid: true,

      pendingEmail:
        record.pendingEmail,

    };

  }


}