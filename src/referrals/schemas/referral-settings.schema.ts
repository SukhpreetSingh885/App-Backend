import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import { HydratedDocument } from "mongoose";

export type ReferralSettingsDocument =
  HydratedDocument<ReferralSettings>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class ReferralSettings {
  @Prop({
    required: true,
    default: "default",
    unique: true,
  })
  key!: string;

  @Prop({
    required: true,
    default: 0,
    min: 0,
  })
  rewardAmount!: number;

  @Prop({
    default: true,
  })
  active!: boolean;

  createdAt!: Date;

  updatedAt!: Date;
}

export const ReferralSettingsSchema =
  SchemaFactory.createForClass(
    ReferralSettings,
  );