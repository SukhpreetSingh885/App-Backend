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
  private readonly OTP_EXPIRED_MESSAGE =
    "OTP has expired. Please request a new one.";
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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
    name?: string,
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

    const recipientName = this.escapeHtml(
      name?.trim() ||
        email.split("@")[0] ||
        "there",
    );

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
            "Verify your Viralstan Academy account",

          htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937;line-height:1.6;">
              <h1 style="margin:0 0 24px;color:#111827;font-size:24px;">
                Verify your Viralstan Academy account
              </h1>

              <p style="margin:0 0 16px;">
                Hello ${recipientName},
              </p>

              <p style="margin:0 0 20px;">
                Use the following OTP to verify your email address for Viralstan Academy.
              </p>

              <p style="margin:0 0 8px;font-weight:700;">
                Your OTP:
              </p>

              <div style="margin:0 0 20px;padding:16px 20px;border:1px solid #d1d5db;border-radius:8px;color:#111827;background:#f9fafb;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;">
                ${otp}
              </div>

              <p style="margin:0 0 20px;">
                This OTP is valid for 5 minutes.
              </p>

              <p style="margin:0 0 8px;font-weight:700;">
                For security reasons:
              </p>

              <ul style="margin:0 0 20px;padding-left:22px;">
                <li>Do not share this OTP with anyone.</li>
                <li>Viralstan Academy will never ask for your OTP.</li>
              </ul>

              <p style="margin:0 0 20px;">
                If you did not request this verification, please ignore this email.
              </p>

              <p style="margin:0;">
                Thanks,<br />
                Viralstan Academy Team
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

  async sendEmailOtp(
    email: string,
    name?: string,
  ) {
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
    const expiresAt = new Date(
      Date.now() +
        this.OTP_EXPIRY_MINUTES *
          60 *
          1000,
    );
    const otpHash = this.hashOtp(otp);

    await this.sendBrevoEmailOtp(
      identifier,
      otp,
      name,
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
          expiresAt,
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
      throw new BadRequestException(
        "OTP has already been used. Please request a new one.",
      );
    }

    const expiresAt =
      verification.expiresAt ??
      verification.otpExpiresAt;

    if (
      !expiresAt ||
      expiresAt.getTime() <= Date.now()
    ) {
      await this.verificationModel.updateOne(
        { _id: verification._id },
        {
          $unset: {
            otpHash: 1,
            expiresAt: 1,
            otpExpiresAt: 1,
          },
        },
      );

      throw new BadRequestException(
        this.OTP_EXPIRED_MESSAGE,
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
          expiresAt: 1,
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
    const expiresAt = new Date(
      Date.now() +
        this.OTP_EXPIRY_MINUTES *
          60 *
          1000,
    );
    const otpHash = this.hashOtp(otp);

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
          expiresAt,
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
      throw new BadRequestException(
        "OTP has already been used. Please request a new one.",
      );
    }

    const expiresAt =
      verification.expiresAt ??
      verification.otpExpiresAt;

    if (
      !expiresAt ||
      expiresAt.getTime() <= Date.now()
    ) {
      await this.verificationModel.updateOne(
        { _id: verification._id },
        {
          $unset: {
            otpHash: 1,
            expiresAt: 1,
            otpExpiresAt: 1,
          },
        },
      );

      throw new BadRequestException(
        this.OTP_EXPIRED_MESSAGE,
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
          expiresAt: 1,
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
async sendPasswordResetOtp(
  email: string,
  name?: string,
) {
  const identifier =
    this.normalizeEmail(email);

  const existing =
    await this.verificationModel.findOne({
      type: VerificationType.PasswordReset,
      identifier,
    });

  this.checkResendCooldown(existing);

  const otp = this.generateOtp();
  const expiresAt = new Date(
    Date.now() +
      this.OTP_EXPIRY_MINUTES * 60 * 1000,
  );
  const otpHash = this.hashOtp(otp);

  await this.sendBrevoEmailOtp(
    identifier,
    otp,
    name,
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
        expiresAt,
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

  if (!otp?.trim()) {
    throw new BadRequestException(
      "OTP is required",
    );
  }

  if (!verification) {
    throw new BadRequestException(
      "Please request a password reset OTP first",
    );
  }

  if (verification.verified) {
    throw new BadRequestException(
      "OTP has already been used. Please request a new one.",
    );
  }

  const expiresAt =
    verification.expiresAt ??
    verification.otpExpiresAt;

  if (
    !expiresAt ||
    expiresAt.getTime() <= Date.now()
  ) {
    await this.verificationModel.updateOne(
      { _id: verification._id },
      {
        $unset: {
          otpHash: 1,
          expiresAt: 1,
          otpExpiresAt: 1,
        },
      },
    );

    throw new BadRequestException(
      this.OTP_EXPIRED_MESSAGE,
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
        expiresAt: 1,
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
  async sendEmailChangeOtp(
    email: string,
    name?: string,
  ) {
  const identifier =
    this.normalizeEmail(email);

  if (!identifier) {
    throw new BadRequestException(
      "New email address is required",
    );
  }

  const existing =
    await this.verificationModel.findOne({
      type: VerificationType.EmailChange,
      identifier,
    });

  this.checkResendCooldown(existing);

  const otp = this.generateOtp();
  const expiresAt = new Date(
    Date.now() +
      this.OTP_EXPIRY_MINUTES * 60 * 1000,
  );
  const otpHash = this.hashOtp(otp);

  await this.sendBrevoEmailOtp(
    identifier,
    otp,
    name,
  );

  await this.verificationModel.findOneAndUpdate(
    {
      type: VerificationType.EmailChange,
      identifier,
    },
    {
      $set: {
        verified: false,
        verifiedAt: null,
        otpHash,
        expiresAt,
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
      "Email change OTP sent successfully",
  };
}

async verifyEmailChangeOtp(
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
      type: VerificationType.EmailChange,
      identifier,
    });

  if (!verification) {
    throw new BadRequestException(
      "Please request an email change OTP first",
    );
  }

  if (verification.verified) {
    throw new BadRequestException(
      "OTP has already been used. Please request a new one.",
    );
  }

  const expiresAt =
    verification.expiresAt ??
    verification.otpExpiresAt;

  if (
    !expiresAt ||
    expiresAt.getTime() <= Date.now()
  ) {
    await this.verificationModel.updateOne(
      { _id: verification._id },
      {
        $unset: {
          otpHash: 1,
          expiresAt: 1,
          otpExpiresAt: 1,
        },
      },
    );

    throw new BadRequestException(
      this.OTP_EXPIRED_MESSAGE,
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
        expiresAt: 1,
        otpExpiresAt: 1,
      },
    },
  );

  return {
    verified: true,
    message:
      "New email verified successfully",
  };
}

async isEmailChangeVerified(
  email: string,
): Promise<boolean> {
  const identifier =
    this.normalizeEmail(email);

  const verification =
    await this.verificationModel.exists({
      type: VerificationType.EmailChange,
      identifier,
      verified: true,
    });

  return Boolean(verification);
}

async consumeEmailChangeVerification(
  email: string,
): Promise<void> {
  const identifier =
    this.normalizeEmail(email);

  await this.verificationModel.deleteOne({
    type: VerificationType.EmailChange,
    identifier,
  });
}
}
