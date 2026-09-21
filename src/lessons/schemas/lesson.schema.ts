import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type LessonDocument = HydratedDocument<Lesson>;

@Schema({ timestamps: true })
export class Lesson {

  @Prop({ required: true })
  courseId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  videoUrl!: string;

  @Prop({ required: true })
  duration!: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ default: false })
  isPreview!: boolean;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
