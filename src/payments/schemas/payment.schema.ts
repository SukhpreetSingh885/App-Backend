import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  courseId!: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({
    required: true,
    default: "inr",
    lowercase: true,
  })
  currency!: string;

  @Prop({
    index: true,
    unique: true,
    sparse: true,
  })
  stripePaymentIntentId?: string;

  @Prop({
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    index: true,
  })
  status!: PaymentStatus;

  @Prop()
  method?: string;

  @Prop()
  paidAt?: Date;

  @Prop({
    default: 0,
    min: 0,
  })
  refundedAmount!: number;

  @Prop()
  refundedAt?: Date;
}

export const PaymentSchema =
  SchemaFactory.createForClass(Payment);