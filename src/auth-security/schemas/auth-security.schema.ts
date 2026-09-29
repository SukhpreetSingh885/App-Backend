import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";


export type AuthSecurityDocument =
  HydratedDocument<AuthSecurity>;



@Schema({
  timestamps: true,
  versionKey: false,
})
export class AuthSecurity {


  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  userId!: string;



  @Prop({
    default: 0,
  })
  failedLoginAttempts!: number;



  @Prop({
    type: Date,
    default: null,
  })
  lockUntil?: Date | null;



  @Prop({
    type: Date,
    default: null,
  })
  lastLoginAt?: Date | null;

}



export const AuthSecuritySchema =
  SchemaFactory.createForClass(AuthSecurity);