import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  AuthSecurity,
  AuthSecuritySchema,
} from "./schemas/auth-security.schema";

import { AuthSecurityService } from "./auth-security.service";


@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AuthSecurity.name,
        schema: AuthSecuritySchema,
      },
    ]),
  ],

  providers: [
    AuthSecurityService,
  ],

  exports: [
    AuthSecurityService,
  ],
})
export class AuthSecurityModule {}