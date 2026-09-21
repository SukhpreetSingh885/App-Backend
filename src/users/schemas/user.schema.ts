import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

import { UserRole } from "../../common/enums/user-role.enum";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.Student })
  role!: UserRole;

  @Prop({
    required: function (this: User) {
      return this.role === UserRole.Student;
    },
    trim: true,
  })
  countryCode?: string;

  @Prop({
    required: function (this: User) {
      return this.role === UserRole.Student;
    },
    trim: true,
  })
  mobile?: string;

  @Prop({
    required: function (this: User) {
      return this.role === UserRole.Student;
    },
    unique: true,
    sparse: true,
    trim: true,
  })
  phoneNumber?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
