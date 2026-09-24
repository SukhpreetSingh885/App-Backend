import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";
import {
  HydratedDocument,
  SchemaTypes,
  Types,
} from "mongoose";

import { User } from "../../users/schemas/user.schema";

export type NotificationDocument =
  HydratedDocument<Notification>;

export enum NotificationRecipientType {
  Student = "student",
  Admin = "admin",
}

export enum NotificationType {
  CoursePublished = "course_published",
  StudentRegistered = "student_registered",
  EnrollmentSuccessful = "enrollment_successful",
  NewEnrollment = "new_enrollment",
  ReferralReward = "referral_reward",
  CertificateAvailable = "certificate_available",
}

@Schema({ timestamps: true, versionKey: false })
export class Notification {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  recipientId!: Types.ObjectId;

  @Prop({
    enum: NotificationRecipientType,
    required: true,
  })
  recipientType!: NotificationRecipientType;

  @Prop({
    enum: NotificationType,
    required: true,
  })
  type!: NotificationType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  message!: string;

  @Prop({ default: false })
  read!: boolean;

  @Prop({ type: SchemaTypes.Mixed })
  data?: Record<string, unknown>;

  @Prop({ select: false })
  eventKey?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationSchema =
  SchemaFactory.createForClass(Notification);

NotificationSchema.index({
  recipientId: 1,
  recipientType: 1,
  createdAt: -1,
});

NotificationSchema.index({
  recipientId: 1,
  recipientType: 1,
  read: 1,
  createdAt: -1,
});

NotificationSchema.index(
  {
    recipientId: 1,
    eventKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      eventKey: { $type: "string" },
    },
  },
);

// Automatically delete notifications 7 days after creation.
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);