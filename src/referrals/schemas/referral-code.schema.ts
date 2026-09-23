import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ReferralCodeDocument =
  HydratedDocument<ReferralCode>;


@Schema({
  timestamps: true,
  versionKey: false,
})
export class ReferralCode {


  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: "User",
    index: true,
  })
  studentId!: Types.ObjectId;



  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  code!: string;



  @Prop({
    default: true,
  })
  active!: boolean;



  createdAt!: Date;

  updatedAt!: Date;
}


export const ReferralCodeSchema =
  SchemaFactory.createForClass(
    ReferralCode,
  );
