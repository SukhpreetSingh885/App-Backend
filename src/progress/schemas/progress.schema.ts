import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ProgressDocument = HydratedDocument<Progress>;

@Schema({ timestamps: true })
export class Progress {

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  courseId!: string;

  @Prop({ required: true })
  lessonId!: string;

  @Prop({ default: false })
  completed!: boolean;

  @Prop({ default: 0 })
  lastWatchedPosition!: number;
}

export const ProgressSchema =
  SchemaFactory.createForClass(Progress);