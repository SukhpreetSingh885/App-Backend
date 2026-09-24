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

import { User } from "../../users/schemas/user.schema";

export type WithdrawalDocument =
  HydratedDocument<Withdrawal>;

export enum WithdrawalStatus {
  Pending = "pending",
  Processing = "processing",
  Paid = "paid",
  Failed = "failed",
  Rejected = "rejected",
}

export enum PayoutMethod {
  Upi = "upi",
  Bank = "bank",
}

@Schema({ timestamps: true, versionKey: false })
export class Withdrawal {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
    required: true,
  
  })
  studentId!: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({
    required: true,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.Pending,
  })
  status!: WithdrawalStatus;

  @Prop({ required: true, enum: PayoutMethod })
  payoutMethod!: PayoutMethod;

  @Prop({ trim: true })
  upiId?: string;

  @Prop({ trim: true })
  accountHolderName?: string;

  @Prop({ trim: true, select: false })
  bankAccountNumber?: string;

  @Prop({ trim: true, uppercase: true })
  ifscCode?: string;

  @Prop({ trim: true })
  failureReason?: string;

  @Prop({ trim: true })
  adminNote?: string;

  @Prop({ trim: true })
  providerReference?: string;

  @Prop()
  paidAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WithdrawalSchema =
  SchemaFactory.createForClass(Withdrawal);

WithdrawalSchema.index({
  studentId: 1,
  createdAt: -1,
});

WithdrawalSchema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          WithdrawalStatus.Pending,
          WithdrawalStatus.Processing,
        ],
      },
    },
  },
);
