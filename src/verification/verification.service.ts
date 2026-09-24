import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import * as crypto from "crypto";

import {
  Verification,
  VerificationDocument,
  VerificationType,
} from "./schemas/verification.schema";

@Injectable()
export class VerificationService {
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly RESEND_COOLDOWN_SECONDS = 60;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectModel(Verification.name)
    private readonly verificationModel: Model<VerificationDocument>,
    private readonly configService: ConfigService,
  ) {}

  private generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string): string {
    return crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeMobile(mobile: string): string {
    return mobile.trim().replace(/\s+/g, "");
  }

  private checkResendCooldown(
    verification: VerificationDocument | null,
  ): void {
    if (!verification?.lastSentAt) {
      return;
    }

    const elapsed =
      Date.now() -
      new Date(verification.lastSentAt).getTime();

    const cooldown =
      this.RESEND_COOLDOWN_SECONDS * 1000;

    if (elapsed < cooldown) {
      const remainingSeconds = Math.ceil(
        (cooldown - elapsed) / 1000,
      );

      throw new HttpException(
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async sendBrevoEmailOtp(
    email: string,
    otp: string,
  ): Promise<void> {
    const apiKey =
      this.configService.get<string>(
        "BREVO_API_KEY",
      );

    const senderEmail =
      this.configService.get<string>(
        "BREVO_SENDER_EMAIL",
      );

    const senderName =
      this.configService.get<string>(
        "BREVO_SENDER_NAME",
      );

    if (
      !apiKey ||
      !senderEmail ||
      !senderName
    ) {
      throw new InternalServerErrorException(
        "Email service is not configured",
      );
    }

    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },

          to: [
            {
              email,
            },
          ],

          subject:
            "Verify your Viralstan Academy email",

          htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;">
              <h2 style="color:#111827;">
                Verify your email
              </h2>

              <p style="color:#475569;font-size:16px;">
                Use the following OTP to verify your email address for Viralstan Academy.
              </p>

              <div
                style="
                  font-size:32px;
                  font-weight:700;
                  letter-spacing:8px;
                  color:#2563EB;
                  margin:24px 0;
                "
              >
                ${otp}
              </div>

              <p style="color:#475569;">
                This OTP is valid for ${this.OTP_EXPIRY_MINUTES} minutes.
              </p>

              <p style="color:#64748B;font-size:14px;">
                If you did not request this code, you can ignore this email.
              </p>
            </div>
          `,
        }),
      },
    );

    if (!response.ok) {
      const errorBody =
        await response.text();

      console.error(
        "Brevo email error:",
        response.status,
        errorBody,
      );

      throw new InternalServerErrorException(
        "Unable to send verification email",
      );
    }
  }

  async sendEmailOtp(email: string) {
    const identifier =
      this.normalizeEmail(email);

    if (!identifier) {
      throw new BadRequestException(
        "Email address is required",
      );
    }

    const existing =
      await this.verificationModel.findOne({
        type: VerificationType.Email,
        identifier,
      });

    this.checkResendCooldown(existing);

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);

    const otpExpiresAt = new Date(
      Date.now() +
        this.OTP_EXPIRY_MINUTES *
          60 *
          1000,
    );

    await this.sendBrevoEmailOtp(
      identifier,
      otp,
    );

    await this.verificationModel.findOneAndUpdate(
      {
        type: VerificationType.Email,
        identifier,
      },
      {
        $set: {
          verified: false,
          verifiedAt: null,
          otpHash,
          otpExpiresAt,
          attempts: 0,
          lastSentAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return {
      message:
        "Email OTP sent successfully",
    };
  }

  async verifyEmailOtp(
    email: string,
    otp: string,
  ) {
    const identifier =
      this.normalizeEmail(email);

    if (!otp?.trim()) {
      throw new BadRequestException(
        "OTP is required",
      );
    }

    const verification =
      await this.verificationModel.findOne({
        type: VerificationType.Email,
        identifier,
      });

    if (!verification) {
      throw new BadRequestException(
        "Please request an email OTP first",
      );
    }

    if (verification.verified) {
      return {
        verified: true,
        message:
          "Email already verified",
      };
    }

    if (
      !verification.otpExpiresAt ||
      verification.otpExpiresAt.getTime() <
        Date.now()
    ) {
      throw new BadRequestException(
        "OTP has expired. Please request a new OTP",
      );
    }

    if (
      verification.attempts >=
      this.MAX_ATTEMPTS
    ) {
      throw new HttpException(
        "Too many incorrect attempts. Please request a new OTP",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const submittedHash =
      this.hashOtp(otp.trim());

    if (
      !verification.otpHash ||
      submittedHash !==
        verification.otpHash
    ) {
      await this.verificationModel.updateOne(
        {
          _id: verification._id,
        },
        {
          $inc: {
            attempts: 1,
          },
        },
      );

      throw new BadRequestException(
        "Invalid OTP",
      );
    }

    await this.verificationModel.updateOne(
      {
        _id: verification._id,
      },
      {
        $set: {
          verified: true,
          verifiedAt: new Date(),
        },
        $unset: {
          otpHash: 1,
          otpExpiresAt: 1,
        },
      },
    );

    return {
      verified: true,
      message:
        "Email verified successfully",
    };
  }

  async sendMobileOtp(mobile: string) {
    const identifier =
      this.normalizeMobile(mobile);

    if (!identifier) {
      throw new BadRequestException(
        "Mobile number is required",
      );
    }

    const existing =
      await this.verificationModel.findOne({
        type: VerificationType.Mobile,
        identifier,
      });

    this.checkResendCooldown(existing);

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);

    const otpExpiresAt = new Date(
      Date.now() +
        this.OTP_EXPIRY_MINUTES *
          60 *
          1000,
    );

    await this.verificationModel.findOneAndUpdate(
      {
        type: VerificationType.Mobile,
        identifier,
      },
      {
        $set: {
          verified: false,
          verifiedAt: null,
          otpHash,
          otpExpiresAt,
          attempts: 0,
          lastSentAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log(
      `[MOBILE OTP] ${identifier} -> ${otp}`,
    );

    return {
      message:
        "Mobile OTP sent successfully",
    };
  }

  async verifyMobileOtp(
    mobile: string,
    otp: string,
  ) {
    const identifier =
      this.normalizeMobile(mobile);

    if (!otp?.trim()) {
      throw new BadRequestException(
        "OTP is required",
      );
    }

    const verification =
      await this.verificationModel.findOne({
        type: VerificationType.Mobile,
        identifier,
      });

    if (!verification) {
      throw new BadRequestException(
        "Please request a mobile OTP first",
      );
    }

    if (verification.verified) {
      return {
        verified: true,
        message:
          "Mobile number already verified",
      };
    }

    if (
      !verification.otpExpiresAt ||
      verification.otpExpiresAt.getTime() <
        Date.now()
    ) {
      throw new BadRequestException(
        "OTP has expired. Please request a new OTP",
      );
    }

    if (
      verification.attempts >=
      this.MAX_ATTEMPTS
    ) {
      throw new HttpException(
        "Too many incorrect attempts. Please request a new OTP",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const submittedHash =
      this.hashOtp(otp.trim());

    if (
      !verification.otpHash ||
      submittedHash !==
        verification.otpHash
    ) {
      await this.verificationModel.updateOne(
        {
          _id: verification._id,
        },
        {
          $inc: {
            attempts: 1,
          },
        },
      );

      throw new BadRequestException(
        "Invalid OTP",
      );
    }

    await this.verificationModel.updateOne(
      {
        _id: verification._id,
      },
      {
        $set: {
          verified: true,
          verifiedAt: new Date(),
        },
        $unset: {
          otpHash: 1,
          otpExpiresAt: 1,
        },
      },
    );

    return {
      verified: true,
      message:
        "Mobile number verified successfully",
    };
  }
async sendPasswordResetOtp(email: string) {
  const identifier =
    this.normalizeEmail(email);

  const existing =
    await this.verificationModel.findOne({
      type: VerificationType.PasswordReset,
      identifier,
    });

  this.checkResendCooldown(existing);

  const otp = this.generateOtp();
  const otpHash = this.hashOtp(otp);

  const otpExpiresAt = new Date(
    Date.now() +
      this.OTP_EXPIRY_MINUTES * 60 * 1000,
  );

  await this.sendBrevoEmailOtp(
    identifier,
    otp,
  );

  await this.verificationModel.findOneAndUpdate(
    {
      type: VerificationType.PasswordReset,
      identifier,
    },
    {
      $set: {
        verified: false,
        verifiedAt: null,
        otpHash,
        otpExpiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return {
    message: "Password reset OTP sent successfully",
  };
}

async verifyPasswordResetOtp(
  email: string,
  otp: string,
) {
  const identifier =
    this.normalizeEmail(email);

  const verification =
    await this.verificationModel.findOne({
      type: VerificationType.PasswordReset,
      identifier,
    });

  if (!verification) {
    throw new BadRequestException(
      "Please request a password reset OTP first",
    );
  }

  if (
    !verification.otpExpiresAt ||
    verification.otpExpiresAt.getTime() <
      Date.now()
  ) {
    throw new BadRequestException(
      "OTP has expired. Please request a new OTP",
    );
  }

  if (
    verification.attempts >=
    this.MAX_ATTEMPTS
  ) {
    throw new HttpException(
      "Too many incorrect attempts. Please request a new OTP",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  const submittedHash =
    this.hashOtp(otp.trim());

  if (
    !verification.otpHash ||
    submittedHash !== verification.otpHash
  ) {
    await this.verificationModel.updateOne(
      {
        _id: verification._id,
      },
      {
        $inc: {
          attempts: 1,
        },
      },
    );

    throw new BadRequestException(
      "Invalid OTP",
    );
  }

  await this.verificationModel.updateOne(
    {
      _id: verification._id,
    },
    {
      $set: {
        verified: true,
        verifiedAt: new Date(),
      },
      $unset: {
        otpHash: 1,
        otpExpiresAt: 1,
      },
    },
  );

  return {
    verified: true,
    message: "OTP verified successfully",
  };
}

async isPasswordResetVerified(
  email: string,
): Promise<boolean> {
  const identifier =
    this.normalizeEmail(email);

  const verification =
    await this.verificationModel.exists({
      type: VerificationType.PasswordReset,
      identifier,
      verified: true,
    });

  return Boolean(verification);
}

async consumePasswordResetVerification(
  email: string,
): Promise<void> {
  const identifier =
    this.normalizeEmail(email);

  await this.verificationModel.deleteOne({
    type: VerificationType.PasswordReset,
    identifier,
  });
}
  async isEmailVerified(
    email: string,
  ): Promise<boolean> {
    const identifier =
      this.normalizeEmail(email);

    const verification =
      await this.verificationModel.exists({
        type: VerificationType.Email,
        identifier,
        verified: true,
      });

    return Boolean(verification);
  }

  async isMobileVerified(
    mobile: string,
  ): Promise<boolean> {
    const identifier =
      this.normalizeMobile(mobile);

    const verification =
      await this.verificationModel.exists({
        type: VerificationType.Mobile,
        identifier,
        verified: true,
      });

    return Boolean(verification);
  }
}