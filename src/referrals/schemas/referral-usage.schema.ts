import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type ReferralUsageDocument =
  HydratedDocument<ReferralUsage>;

export enum ReferralUsageStatus {
  Pending = "pending",
  Completed = "completed",
  Cancelled = "cancelled",
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class ReferralUsage {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: "User",
    index: true,
  })
  referrerId!: Types.ObjectId;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: "User",
  })
  referredStudentId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    uppercase: true,
  })
  referralCode!: string;

  @Prop({
    required: true,
    min: 0,
  })
  rewardAmount!: number;

  @Prop({
    enum: ReferralUsageStatus,
    default: ReferralUsageStatus.Pending,
    index: true,
  })
  status!: ReferralUsageStatus;

  @Prop({
    default: false,
  })
  rewardGiven!: boolean;

  createdAt!: Date;

  updatedAt!: Date;
}

export const ReferralUsageSchema =
  SchemaFactory.createForClass(
    ReferralUsage,
  );

ReferralUsageSchema.index(
  {
    referredStudentId: 1,
  },
  {
    unique: true,
  },
);

ReferralUsageSchema.index(
  {
    referralCode: 1,
  },
  {
    unique: true,
  },
);