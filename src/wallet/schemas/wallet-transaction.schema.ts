import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type WalletTransactionDocument =
  HydratedDocument<WalletTransaction>;

export enum WalletTransactionType {
  Credit = "credit",
  Debit = "debit",
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class WalletTransaction {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: "User",
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    min: 0,
  })
  amount!: number;

  @Prop({
    required: true,
    enum: WalletTransactionType,
  })
  type!: WalletTransactionType;

  @Prop({
    required: true,
    trim: true,
  })
  reason!: string;

  @Prop({
    trim: true,
  })
  reference?: string;

  createdAt!: Date;

  updatedAt!: Date;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(
    WalletTransaction,
  );

WalletTransactionSchema.index(
  {
    reference: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);