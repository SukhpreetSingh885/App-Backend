import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type VerificationDocument =
  HydratedDocument<Verification>;

export enum VerificationType {
  Email = "email",
  Mobile = "mobile",
  PasswordReset = "password_reset",
  EmailChange = "email_change",
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Verification {
  @Prop({
    required: true,
    enum: VerificationType,
  })
  type!: VerificationType;

  // Email address or full international mobile number,
  // for example: user@gmail.com or +919876543210
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  identifier!: string;

  // Has this email/mobile successfully passed OTP verification?
  @Prop({
    default: false,
  })
  verified!: boolean;

  // When verification was completed.
  @Prop()
  verifiedAt?: Date;

  // Used for email OTP.
  // Mobile OTP will later be handled by Twilio Verify.
  @Prop()
  otpHash?: string;

  // Expiry time for email OTP.
  @Prop()
  otpExpiresAt?: Date;

  // Prevent unlimited OTP guessing.
  @Prop({
    default: 0,
    min: 0,
  })
  attempts!: number;

  // Used to control how frequently another OTP can be sent.
  @Prop()
  lastSentAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const VerificationSchema =
  SchemaFactory.createForClass(Verification);

/*
 * One verification record for each type + identifier.
 *
 * Examples:
 * email  + user@gmail.com
 * mobile + +919876543210
 */
VerificationSchema.index(
  {
    type: 1,
    identifier: 1,
  },
  {
    unique: true,
  },
);