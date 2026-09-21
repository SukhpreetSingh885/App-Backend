import { IsMongoId } from "class-validator";

export class CreatePaymentDto {
  @IsMongoId()
  courseId!: string;
}
