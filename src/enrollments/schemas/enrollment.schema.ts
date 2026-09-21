import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

import { EnrollmentStatus } from "../interfaces/enrollment.interface";

export type EnrollmentDocument = HydratedDocument<Enrollment>;

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  courseId!: string;

  @Prop({ required: true })
  enrollmentDate!: Date;

  @Prop({
    enum: EnrollmentStatus,
    default: EnrollmentStatus.Active,
  })
  status!: EnrollmentStatus;

  @Prop({ index: true, unique: true, sparse: true })
  sourcePaymentIntentId?: string;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
EnrollmentSchema.index({ userId: 1, courseId: 1 });
