import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";


export type AdminOtpDocument =
  HydratedDocument<AdminOtp>;


export enum AdminOtpPurpose {

  ChangeEmail = "change-email",

  ChangePassword = "change-password",

  VerifyOldEmail = "verify-old-email",

  VerifyNewEmail = "verify-new-email",

}


@Schema({
  timestamps: true,
  versionKey: false,
})
export class AdminOtp {


  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: "User",
    index: true,
  })
  adminId!: Types.ObjectId;



  @Prop({
    required: true,
    enum: AdminOtpPurpose,
  })
  purpose!: AdminOtpPurpose;



  @Prop({
    required: true,
    select: false,
  })
  otpHash!: string;



  @Prop({
    required: true,
  })
  expiresAt!: Date;



  @Prop({
    default: 0,
  })
  attempts!: number;



  @Prop({
    default: false,
  })
  used!: boolean;



  // New email waiting for verification
  @Prop({
    trim: true,
    lowercase: true,
  })
  pendingEmail?: string;



  // New field
  // Used after old email OTP verification
  @Prop({
    default: false,
  })
  emailVerified!: boolean;



  createdAt!: Date;

  updatedAt!: Date;
}



export const AdminOtpSchema =
  SchemaFactory.createForClass(
    AdminOtp,
  );



AdminOtpSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);



AdminOtpSchema.index({
  adminId: 1,
  purpose: 1,
});