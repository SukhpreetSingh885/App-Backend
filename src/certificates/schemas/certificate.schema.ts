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

import { Course } from "../../courses/schemas/course.schema";
import { User } from "../../users/schemas/user.schema";

export type CertificateDocument =
  HydratedDocument<Certificate>;

@Schema({ versionKey: false })
export class Certificate {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  })
  studentId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Course.name,
    required: true,
  })
  courseId!: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  certificateNumber!: string;

  @Prop({ required: true })
  issuedAt!: Date;
}

export const CertificateSchema =
  SchemaFactory.createForClass(Certificate);

CertificateSchema.index(
  { studentId: 1, courseId: 1 },
  { unique: true },
);

CertificateSchema.index({
  studentId: 1,
  issuedAt: -1,
});
