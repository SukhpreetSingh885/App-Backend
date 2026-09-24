import {
  forwardRef,
  Module,
} from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../common/guards/roles.guard";
import { VerificationModule } from "../verification/verification.module";

import {
  User,
  UserSchema,
} from "./schemas/user.schema";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [
    forwardRef(() => AuthModule),

    VerificationModule,

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [UsersController],

  providers: [
    UsersService,
    RolesGuard,
  ],

  exports: [UsersService],
})
export class UsersModule {}