import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type CourseDocument = HydratedDocument<Course>;

@Schema()
export class CourseLesson {
  @Prop({ required: true })
  title!: string;

  @Prop({ default: "" })
  duration!: string;

  @Prop({ default: "" })
  videoUrl!: string;

  @Prop({ default: false })
  isPreview!: boolean;
}

const CourseLessonSchema =
  SchemaFactory.createForClass(CourseLesson);


@Schema()
export class CourseModule {
  @Prop({ required: true })
  title!: string;

  @Prop({
    type: [CourseLessonSchema],
    default: [],
  })
  lessons!: CourseLesson[];
}

const CourseModuleSchema =
  SchemaFactory.createForClass(CourseModule);


@Schema({ timestamps: true })
export class Course {

  @Prop({ required: true })
  title!: string;


  @Prop({ required: true })
  description!: string;


  @Prop({ default: "Viralstan Academy" })
  instructor!: string;


  @Prop({ default: "" })
  category!: string;


  @Prop({ default: "" })
  thumbnail!: string;


  @Prop({ default: 0, min: 0 })
  price!: number;


  @Prop({ default: 0, min: 0 })
  originalPrice!: number;


  @Prop({
    default: 0,
    min: 0,
    max: 5,
  })
  rating!: number;


  @Prop({ default: 0, min: 0 })
  students!: number;


  @Prop({ default: 0, min: 0 })
  lessons!: number;


  @Prop({ default: "" })
  duration!: string;


  @Prop({ default: "" })
  language!: string;


  @Prop({ default: "Beginner" })
  level!: string;


  @Prop({
    type: [CourseModuleSchema],
    default: [],
  })
  modules!: CourseModule[];


  @Prop({
    enum: ["draft", "published"],
    default: "draft",
  })
  status!: string;


  @Prop({ default: false })
  featured!: boolean;


  @Prop({ default: false })
  popular!: boolean;
}


export const CourseSchema =
  SchemaFactory.createForClass(Course);