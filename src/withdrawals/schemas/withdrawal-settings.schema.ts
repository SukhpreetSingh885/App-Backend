import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type WithdrawalSettingsDocument =
  HydratedDocument<WithdrawalSettings>;

@Schema({ timestamps: true, versionKey: false })
export class WithdrawalSettings {
  @Prop({ required: true, unique: true, default: "default" })
  key!: string;

  @Prop({ required: true, default: true })
  withdrawalsEnabled!: boolean;

  @Prop({ required: true, default: 100, min: 0 })
  minimumWithdrawalAmount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WithdrawalSettingsSchema =
  SchemaFactory.createForClass(WithdrawalSettings);
