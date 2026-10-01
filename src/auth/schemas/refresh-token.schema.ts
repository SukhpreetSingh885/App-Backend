import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";


export type RefreshTokenDocument =
  HydratedDocument<RefreshToken>;


@Schema({
  timestamps: true,
  versionKey: false,
})
export class RefreshToken {


  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;


  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  tokenId!: string;


  @Prop({
    required: true,
  })
  tokenHash!: string;


  @Prop({
    required: true,
  })
  expiresAt!: Date;


  @Prop({
    default: false,
  })
  revoked!: boolean;


  @Prop()
  deviceInfo?: string;


  @Prop()
  ipAddress?: string;


  @Prop()
  userAgent?: string;

}


export const RefreshTokenSchema =
  SchemaFactory.createForClass(
    RefreshToken,
  );